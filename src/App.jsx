import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import {
  Plus, Trash2, Camera, X, ChevronDown, ChevronRight, Package,
  MapPin, Calendar, LayoutTemplate, Luggage, Check, Loader2,
} from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 10);
const STORAGE_KEY = "packlist-app-data-v1";

const TEMPLATES = {
  "Two-Week International Trip": [
    { category: "Documents", items: ["Passport", "Visa printout", "Travel insurance", "Flight tickets", "Hotel bookings"] },
    { category: "Electronics", items: ["Phone charger", "Power bank", "Camera", "Charger cables", "Universal adapter"] },
    { category: "Clothing", items: ["T-shirts", "Jeans", "Jacket", "Underwear", "Socks", "Comfortable shoes"] },
    { category: "Toiletries", items: ["Toothbrush", "Toothpaste", "Shampoo", "Sunscreen", "Medications"] },
  ],
  "Weekend Camping": [
    { category: "Shelter", items: ["Tent", "Sleeping bag", "Sleeping pad"] },
    { category: "Cooking", items: ["Stove", "Fuel canister", "Cookware", "Utensils", "Water filter"] },
    { category: "Clothing", items: ["Rain jacket", "Warm layers", "Hiking boots"] },
  ],
  "Business Conference": [
    { category: "Documents", items: ["Badge / registration", "Business cards", "Laptop charger"] },
    { category: "Clothing", items: ["Suit / blazer", "Dress shoes", "Dress shirts"] },
    { category: "Electronics", items: ["Laptop", "Presentation clicker", "Headphones"] },
  ],
};
const ACCENTS = ["c1", "c2", "c3", "c4", "c5"];

function fileToCompressedBlob(file, maxDim = 480, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
      else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [trips, setTrips] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemDrafts, setNewItemDrafts] = useState({});
  const [previewItemId, setPreviewItemId] = useState(null);
  const fileInputRefs = useRef({});
  const hasLoaded = useRef(false);
  useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  return () => listener.subscription.unsubscribe();
}, []);
  useEffect(() => {
  if (!session) return;
  loadData();
}, [session]);

async function loadData() {
  setLoading(true);
  const { data: tripsData } = await supabase.from("trips").select("*").order("created_at");
  const { data: catsData } = await supabase.from("categories").select("*").order("created_at");
  const { data: itemsData } = await supabase.from("items").select("*").order("created_at");

  setTrips((tripsData || []).map(t => ({ ...t, startDate: t.start_date, endDate: t.end_date })));
  setCategories((catsData || []).map(c => ({ ...c, tripId: c.trip_id })));
  setItems((itemsData || []).map(i => ({ ...i, categoryId: i.category_id, photo: i.photo_url })));
  if (tripsData && tripsData[0]) setSelectedTripId(tripsData[0].id);
  setExpanded(Object.fromEntries((catsData || []).map((c) => [c.id, true])));
  setLoading(false);
}

 

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || null;
  const tripCategories = categories.filter((c) => c.tripId === selectedTripId);

  function tripProgress(tripId) {
    const catIds = categories.filter((c) => c.tripId === tripId).map((c) => c.id);
    const tripItems = items.filter((i) => catIds.includes(i.categoryId));
    return { checked: tripItems.filter((i) => i.checked).length, total: tripItems.length };
  }

  async function addTrip({ name, destination, startDate, endDate }) {
  const accent = ACCENTS[trips.length % ACCENTS.length];
  const { data, error } = await supabase
    .from("trips")
    .insert({
      name,
      destination,
      start_date: startDate || null,
      end_date: endDate || null,
      accent,
      user_id: session.user.id,
    })
    .select()
    .single();

  if (error) { console.error(error); return; }

  setTrips((t) => [...t, { ...data, startDate: data.start_date, endDate: data.end_date }]);
  setSelectedTripId(data.id);
  setShowNewTrip(false);
}

  async function deleteTrip(tripId) {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) { console.error(error); return; }

  const catIds = categories.filter((c) => c.tripId === tripId).map((c) => c.id);
  setItems((i) => i.filter((it) => !catIds.includes(it.categoryId)));
  setCategories((c) => c.filter((cat) => cat.tripId !== tripId));
  setTrips((t) => t.filter((tr) => tr.id !== tripId));
  if (selectedTripId === tripId) {
    const remaining = trips.filter((tr) => tr.id !== tripId);
    setSelectedTripId(remaining[0] ? remaining[0].id : null);
  }
}

  async function addCategory(name) {
  if (!name.trim() || !selectedTripId) return;
  const { data, error } = await supabase
    .from("categories")
    .insert({ trip_id: selectedTripId, name: name.trim() })
    .select()
    .single();

  if (error) { console.error(error); return; }

  const newCat = { ...data, tripId: data.trip_id };
  setCategories((c) => [...c, newCat]);
  setExpanded((e) => ({ ...e, [newCat.id]: true }));
  setNewCategoryName("");
  setAddingCategory(false);
}

  async function deleteCategory(catId) {
  const { error } = await supabase.from("categories").delete().eq("id", catId);
  if (error) { console.error(error); return; }

  setItems((i) => i.filter((it) => it.categoryId !== catId));
  setCategories((c) => c.filter((cat) => cat.id !== catId));
}

  async function loadTemplate(templateName) {
  if (!selectedTripId) return;
  const template = TEMPLATES[templateName];
  const newCats = [];
  const newExpanded = {};

  for (const group of template) {
    const { data: catData, error: catError } = await supabase
      .from("categories")
      .insert({ trip_id: selectedTripId, name: group.category })
      .select()
      .single();
    if (catError) { console.error(catError); continue; }

    const cat = { ...catData, tripId: catData.trip_id };
    newCats.push(cat);
    newExpanded[cat.id] = true;

    const itemRows = group.items.map((name) => ({ category_id: cat.id, name }));
    const { data: itemsData, error: itemsError } = await supabase.from("items").insert(itemRows).select();
    if (itemsError) { console.error(itemsError); continue; }

    const mappedItems = itemsData.map((it) => ({ ...it, categoryId: it.category_id, photo: it.photo_url }));
    setItems((i) => [...i, ...mappedItems]);
  }

  setCategories((c) => [...c, ...newCats]);
  setExpanded((e) => ({ ...e, ...newExpanded }));
  setShowTemplates(false);
}

  async function addItem(catId, name) {
  if (!name.trim()) return;
  const { data, error } = await supabase
    .from("items")
    .insert({ category_id: catId, name: name.trim() })
    .select()
    .single();

  if (error) { console.error(error); return; }

  setItems((i) => [...i, { ...data, categoryId: data.category_id, photo: data.photo_url }]);
  setNewItemDrafts((d) => ({ ...d, [catId]: "" }));
}

  async function toggleItem(itemId) {
  const item = items.find((i) => i.id === itemId);
  const { error } = await supabase.from("items").update({ checked: !item.checked }).eq("id", itemId);
  if (error) { console.error(error); return; }

  setItems((i) => i.map((it) => (it.id === itemId ? { ...it, checked: !it.checked } : it)));
}

  async function deleteItem(itemId) {
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) { console.error(error); return; }

  setItems((i) => i.filter((it) => it.id !== itemId));
}

  async function handlePhotoSelect(itemId, file) {
  console.log("1. handlePhotoSelect called", itemId, file);
  if (!file) { console.log("No file received"); return; }
  try {
    console.log("2. starting compression");
    const compressedBlob = await fileToCompressedBlob(file);
    console.log("3. compression done", compressedBlob);

    const filePath = `${session.user.id}/${itemId}-${Date.now()}.jpg`;
    console.log("4. uploading to path", filePath);

    const { error: uploadError } = await supabase.storage
      .from("item-photos")
      .upload(filePath, compressedBlob, { contentType: "image/jpeg" });

    console.log("5. upload result", uploadError);
    if (uploadError) { console.error("UPLOAD ERROR", uploadError); return; }

    const { data: urlData } = supabase.storage.from("item-photos").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;
    console.log("6. got public url", publicUrl);

    const { error: updateError } = await supabase
      .from("items")
      .update({ photo_url: publicUrl })
      .eq("id", itemId);

    console.log("7. db update result", updateError);
    if (updateError) { console.error("DB UPDATE ERROR", updateError); return; }

    setItems((i) => i.map((it) => (it.id === itemId ? { ...it, photo: publicUrl } : it)));
    console.log("8. done, state updated");
  } catch (e) {
    console.error("CAUGHT EXCEPTION", e);
  }
}

  async function removePhoto(itemId) {
  const { error } = await supabase.from("items").update({ photo_url: null }).eq("id", itemId);
  if (error) { console.error(error); return; }

  setItems((i) => i.map((it) => (it.id === itemId ? { ...it, photo: null } : it)));
} 

  const previewItem = items.find((i) => i.id === previewItemId) || null;
  if (!session) {
  return <Auth />;
}
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="animate-spin text-stone-400" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[#F1ECE0] text-[#23262B]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-[280px] shrink-0 border-r border-[#DED4BE] flex flex-col bg-[#EDE6D6]/60">
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
  <div className="flex items-center gap-2">
    <Luggage size={20} className="text-[#8F6A20]" />
    <span className="text-lg font-semibold tracking-tight">Packlist</span>
  </div>
  <button
    onClick={() => supabase.auth.signOut()}
    className="text-xs text-[#8F887A] hover:text-[#B4482F] transition"
    title="Log out"
  >
    Log out
  </button>
</div>
        <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-4">
          {trips.map((trip) => {
            const prog = tripProgress(trip.id);
            const pct = prog.total ? Math.round((prog.checked / prog.total) * 100) : 0;
            const active = trip.id === selectedTripId;
            return (
              <button key={trip.id} onClick={() => setSelectedTripId(trip.id)}
                className={`relative w-full text-left rounded-md border pl-4 pr-3 py-3 transition ${active ? "bg-white border-[#B8862E] shadow-sm" : "bg-white/50 border-[#DED4BE] hover:bg-white"}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${trip.accent}`} />
                  <span className="font-medium text-sm truncate">{trip.name}</span>
                </div>
                {trip.destination && (
                  <div className="flex items-center gap-1 text-xs text-[#5B564C] mt-1">
                    <MapPin size={11} /> {trip.destination}
                  </div>
                )}
                <div className="mt-2 h-1.5 w-full bg-[#EDE6D6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2F6F63]" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[10px] font-mono text-[#5B564C]">{prog.checked}/{prog.total} packed</div>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-[#DED4BE]">
          <button onClick={() => setShowNewTrip(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-[#B8862E] text-[#8F6A20] py-2.5 text-sm font-medium hover:bg-[#B8862E]/10 transition">
            <Plus size={16} /> New trip
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedTrip ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <Package size={32} className="text-[#B8862E] mb-3" />
            <p className="text-xl mb-1">No trip selected</p>
            <p className="text-sm text-[#5B564C] mb-4">Create a trip to start building your packing list.</p>
            <button onClick={() => setShowNewTrip(true)} className="rounded-md bg-[#23262B] text-white px-4 py-2 text-sm font-medium hover:bg-black transition">
              Create your first trip
            </button>
          </div>
        ) : (
          <>
            <div className="px-8 pt-7 pb-5 border-b border-[#DED4BE] bg-[#FBF8F0]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{selectedTrip.name}</h1>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-[#5B564C]">
                    {selectedTrip.destination && <span className="flex items-center gap-1"><MapPin size={13} /> {selectedTrip.destination}</span>}
                  </div>
                </div>
                <button onClick={() => deleteTrip(selectedTrip.id)} className="text-[#5B564C] hover:text-[#B4482F] transition p-1.5 rounded hover:bg-[#B4482F]/10">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <div className="relative">
                  <button onClick={() => setShowTemplates((s) => !s)}
                    className="flex items-center gap-1.5 rounded-md border border-[#DED4BE] bg-white px-3 py-1.5 text-xs font-medium hover:border-[#B8862E] transition">
                    <LayoutTemplate size={14} /> Load template
                  </button>
                  {showTemplates && (
                    <div className="absolute z-20 mt-1 w-64 bg-white border border-[#DED4BE] rounded-md shadow-lg overflow-hidden">
                      {Object.keys(TEMPLATES).map((name) => (
                        <button key={name} onClick={() => loadTemplate(name)} className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#F1ECE0] border-b border-[#EDE6D6] last:border-0">
                          <div className="font-medium">{name}</div>
                          <div className="text-[#5B564C] mt-0.5 text-[10px] font-mono">{TEMPLATES[name].length} categories</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setAddingCategory(true)} className="flex items-center gap-1.5 rounded-md bg-[#23262B] text-white px-3 py-1.5 text-xs font-medium hover:bg-black transition">
                  <Plus size={14} /> Add category
                </button>
              </div>

              {addingCategory && (
                <div className="mt-3 flex items-center gap-2">
                  <input autoFocus value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addCategory(newCategoryName); if (e.key === "Escape") setAddingCategory(false); }}
                    placeholder="Category name, e.g. Toiletries"
                    className="text-sm border border-[#DED4BE] rounded-md px-3 py-1.5 flex-1 max-w-xs focus:outline-none focus:border-[#B8862E]" />
                  <button onClick={() => addCategory(newCategoryName)} className="text-xs bg-[#2F6F63] text-white px-3 py-1.5 rounded-md">Add</button>
                  <button onClick={() => { setAddingCategory(false); setNewCategoryName(""); }} className="text-xs text-[#5B564C] px-2">Cancel</button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
              {tripCategories.length === 0 && (
                <div className="text-center py-16 text-[#8F887A] text-sm">No categories yet — add one or load a template above.</div>
              )}
              {tripCategories.map((cat) => {
                const catItems = items.filter((i) => i.categoryId === cat.id);
                const checkedCount = catItems.filter((i) => i.checked).length;
                const isOpen = expanded[cat.id];
                const draft = newItemDrafts[cat.id] || "";
                return (
                  <div key={cat.id} className="bg-white border border-[#DED4BE] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                      onClick={() => setExpanded((e) => ({ ...e, [cat.id]: !e[cat.id] }))}>
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown size={15} className="text-[#8F887A]" /> : <ChevronRight size={15} className="text-[#8F887A]" />}
                        <span className="font-medium text-sm">{cat.name}</span>
                        <span className="text-[10px] font-mono text-[#8F887A] bg-[#F1ECE0] px-1.5 py-0.5 rounded">{checkedCount}/{catItems.length}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="text-[#8F887A] hover:text-[#B4482F] p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="border-t border-[#EDE6D6]">
                        {catItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F1ECE0] last:border-0 group">
                            <button onClick={() => toggleItem(item.id)}
                              className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition ${item.checked ? "bg-[#2F6F63] border-[#2F6F63]" : "border-[#DED4BE] hover:border-[#2F6F63]"}`}>
                              {item.checked && <Check size={13} className="text-white" />}
                            </button>
                            <span className={`flex-1 text-sm ${item.checked ? "line-through text-[#B0AB9E]" : ""}`}>{item.name}</span>
                            {item.photo ? (
                              <button onClick={() => setPreviewItemId(item.id)} className="shrink-0 w-8 h-8 rounded overflow-hidden border border-[#DED4BE]">
                                <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <button onClick={() => fileInputRefs.current[item.id] && fileInputRefs.current[item.id].click()}
                                className="opacity-0 group-hover:opacity-100 shrink-0 w-8 h-8 rounded border border-dashed border-[#DED4BE] flex items-center justify-center text-[#8F887A] hover:border-[#B8862E] hover:text-[#B8862E] transition">
                                <Camera size={14} />
                              </button>
                            )}
                            <input ref={(el) => (fileInputRefs.current[item.id] = el)} type="file" accept="image/*" capture="environment" className="hidden"
                              onChange={(e) => handlePhotoSelect(item.id, e.target.files && e.target.files[0])} />
                            <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-[#8F887A] hover:text-[#B4482F] p-1">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 px-4 py-2.5">
                          <Plus size={14} className="text-[#B0AB9E]" />
                          <input value={draft} onChange={(e) => setNewItemDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") addItem(cat.id, draft); }}
                            placeholder="Add an item…" className="flex-1 text-sm py-1 focus:outline-none bg-transparent placeholder:text-[#B0AB9E]" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showNewTrip && <NewTripModal onCancel={() => setShowNewTrip(false)} onCreate={addTrip} />}

      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6 overflow-y-auto" onClick={() => setPreviewItemId(null)}>
          <div className="bg-white rounded-lg p-3 max-w-sm w-full my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-sm font-medium">{previewItem.name}</span>
              <button onClick={() => setPreviewItemId(null)} className="text-[#8F887A] hover:text-black"><X size={16} /></button>
            </div>
            <img src={previewItem.photo} alt={previewItem.name} className="w-full rounded-md object-contain max-h-[60vh]" />
            <div className="flex justify-between mt-3 px-1">
              <button onClick={() => fileInputRefs.current[previewItem.id] && fileInputRefs.current[previewItem.id].click()} className="text-xs text-[#2F6F63] font-medium">Replace photo</button>
              <button onClick={() => { removePhoto(previewItem.id); setPreviewItemId(null); }} className="text-xs text-[#B4482F] font-medium">Remove photo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewTripModal({ onCancel, onCreate }) {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!name.trim()) { setError("Give your trip a name."); return; }
    onCreate({ name: name.trim(), destination: destination.trim(), startDate, endDate });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white rounded-lg p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto my-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">New trip</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#5B564C]">Trip name</label>
            <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Two-Week Trip to Almaty"
              className="mt-1 w-full text-sm border border-[#DED4BE] rounded-md px-3 py-2 focus:outline-none focus:border-[#B8862E]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#5B564C]">Destination (optional)</label>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Almaty, Kazakhstan"
              className="mt-1 w-full text-sm border border-[#DED4BE] rounded-md px-3 py-2 focus:outline-none focus:border-[#B8862E]" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-[#5B564C]">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full text-sm border border-[#DED4BE] rounded-md px-3 py-2 focus:outline-none focus:border-[#B8862E]" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-[#5B564C]">End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full text-sm border border-[#DED4BE] rounded-md px-3 py-2 focus:outline-none focus:border-[#B8862E]" />
            </div>
          </div>
          {error && <p className="text-xs text-[#B4482F]">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="text-sm px-3 py-1.5 text-[#5B564C]">Cancel</button>
          <button onClick={submit} className="text-sm px-4 py-1.5 rounded-md bg-[#23262B] text-white font-medium hover:bg-black transition">Create trip</button>
        </div>
      </div>
    </div>
  );
}