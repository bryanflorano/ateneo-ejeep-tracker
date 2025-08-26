// --- 0. IMPORT FIREBASE & LEAFLET FUNCTIONS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getFirestore, doc, collection, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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

// 7. MANAGE JEEP ICONS
let jeepIcons = {};

const customJeepIcon = L.icon({
    iconUrl: 'images/jeep.png',
    iconSize:     [40, 40], // The size of the icon in pixels [width, height]
    iconAnchor:   [20, 20], // The point of the icon which will correspond to marker's location
});

// 8. LISTEN FOR REAL-TIME UPDATES FOR ALL JEEPS
const jeepsRef = collection(db, 'jeeps');

onSnapshot(jeepsRef, (snapshot) => {
    // This function runs every time there's any change in the 'jeeps' collection

    snapshot.docs.forEach(doc => {
        const jeepId = doc.id;        // The document ID, e.g., "jeep_1"
        const jeepData = doc.data();  // The data object {name, status, etc.}
        
        // Find the existing icon for this specific jeep, if it's already on the map
        const existingIcon = jeepIcons[jeepId];

        // --- A: Handle ACTIVE Jeeps ---
        // If the jeep's status is 'active', we need to show it or move it.
        if (jeepData.status === 'active') {
            const stationId = jeepData.current_station_id;
            
            // Safety check: if the station ID from the database is invalid, skip this jeep.
            if (!stations[stationId]) {
                console.error(`Invalid station ID "${stationId}" for jeep "${jeepId}"`);
                return;
            }
            
            const jeepCoords = stations[stationId].coords;

            // Check if an icon for this jeep already exists
            if (existingIcon) {
                // If it exists, just move it to the new coordinates
                existingIcon.setLatLng(jeepCoords);
            } else {
                // If it doesn't exist, create a new marker for it
                const newIcon = L.marker(jeepCoords, { icon: customJeepIcon }).addTo(map);
                // Store the new icon in our jeepIcons object so we can find it later
                jeepIcons[jeepId] = newIcon;
            }
            
            // --- Handle Stale Data and Popups ---
            const currentIcon = jeepIcons[jeepId];
            let popupText = `${jeepData.name} is at: ${stations[stationId].name}`;

            // Check if last_updated field exists and is valid
            if (jeepData.last_updated && jeepData.last_updated.toDate) {
                const lastUpdate = jeepData.last_updated.toDate();
                const minutesAgo = (new Date() - lastUpdate) / 1000 / 60;

                // If data is more than 10 minutes old, make the icon faded
                if (minutesAgo > 10) {
                    currentIcon.setOpacity(0.5);
                } else {
                    currentIcon.setOpacity(1.0);
                }

                // Add "last seen" text to the popup
                if (minutesAgo > 1) {
                    popupText += ` (last seen ${Math.round(minutesAgo)} mins ago)`;
                }
            }
            
            currentIcon.bindPopup(popupText);

        // --- B: Handle INACTIVE Jeeps ---
        // If the jeep's status is not 'active', we must remove it from the map.
        } else {
            // Check if an icon for this jeep is currently on the map
            if (existingIcon) {
                map.removeLayer(existingIcon); // Remove the icon from the map
                delete jeepIcons[jeepId];      // Remove the icon from our tracking object
            }
        }
    });
});

// 9. FUNCTION TO UPDATE FIREBASE
// The station markers now need to know WHICH jeep to update.
// For now, let's hardcode it to always update 'jeep_1' for simplicity.
// We will improve this in the next level.
async function updateJeepLocation(newStationId) {
    const jeepToUpdate = 'jeep_1'; // Still hardcoded
    console.log(`Updating ${jeepToUpdate} location to: ${newStationId}`);
    
    const jeepRef = doc(db, 'jeeps', jeepToUpdate);
    try {
        await updateDoc(jeepRef, {
            current_station_id: newStationId,
            last_updated: serverTimestamp() // This adds the current server time
        });
    } catch (error) {
        console.error("Error updating document: ", error);
    }
}