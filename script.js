// --- 0. IMPORT FIREBASE & LEAFLET FUNCTIONS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getFirestore, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBZaelYoObXfxQ8kzC1tRcOpfJm29vU1OY",
    authDomain: "ateneo-e-jeep.firebaseapp.com",
    projectId: "ateneo-e-jeep",
    storageBucket: "ateneo-e-jeep.firebasestorage.app",
    messagingSenderId: "437106663014",
    appId: "1:437106663014:web:102ac705e362e40e3bd7a7",
    measurementId: "G-XSDKZBZQ46"
};

// --- 2. INITIALIZE FIREBASE & FIRESTORE ---
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// --- 3. INITIALIZE THE MAP ---
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -1,
    maxZoom: 1
});

// --- 4. DEFINE MAP BOUNDS AND IMAGE ---
// Replace 1000 and 600 with your image's width and height
const bounds = [[0, 0], [600, 1000]]; 
const imageUrl = 'images/map.png';
L.imageOverlay(imageUrl, bounds).addTo(map);
map.fitBounds(bounds);

// --- 5. DEFINE STATIONS ---
const stations = {
    'xavier': { name: 'Xavier', coords: [295, 155] },
    'hagdan': { name: 'Hagdan', coords: [295, 380] },
    'gate_1': { name: 'Gate 1', coords: [295, 525] },
    'leong': { name: 'Leong', coords: [295, 840] }
};

// --- 6. ADD STATION MARKERS TO MAP & ADD CLICK EVENTS ---
Object.keys(stations).forEach(stationId => {
    const station = stations[stationId];
    const marker = L.marker(station.coords).addTo(map)
        .bindPopup(station.name);
    
    marker.on('click', () => {
        updateJeepLocation(stationId);
    });
});

// --- 7. INITIALIZE JEEP ICON ---
let jeepIcon = null;

// --- 8. LISTEN FOR REAL-TIME JEEP UPDATES ---
const jeepRef = doc(db, 'jeeps', 'jeep_1');

onSnapshot(jeepRef, (doc) => {
    const jeepData = doc.data();
    if (!jeepData) {
        console.error("Jeep document not found in Firestore!");
        return;
    }

    const stationId = jeepData.current_station_id;
    // Check if the stationId from Firestore exists in your local stations object
    if (!stations[stationId]) {
        console.error(`Station ID "${stationId}" from Firestore is not defined in the stations object.`);
        return;
    }
    
    const jeepCoords = stations[stationId].coords;

    if (!jeepIcon) {
        jeepIcon = L.marker(jeepCoords).addTo(map);
    } else {
        jeepIcon.setLatLng(jeepCoords);
    }
    
    jeepIcon.bindPopup(`Jeep is at: ${stations[stationId].name}`).openPopup();
});

// --- 9. FUNCTION TO UPDATE FIREBASE ---
async function updateJeepLocation(newStationId) {
    console.log(`Updating jeep location to: ${newStationId}`);
    try {
        await updateDoc(jeepRef, {
            current_station_id: newStationId
        });
        console.log("Document successfully updated!");
    } catch (error)
    {
        console.error("Error updating document: ", error);
    }
}