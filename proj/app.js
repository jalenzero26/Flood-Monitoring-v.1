// 1. Initialize Map view with locked zoom constraints
const map = L.map('map', {
    center: [14.3122, 121.1150], 
    zoom: 12.5,
    minZoom: 12.5,               
    maxZoom: 18,                 
    zoomSnap: 0.5,
    zoomDelta: 0.5
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

// 2. Comprehensive Flood Dataset (Water Level Depths in cm)
// Feel free to modify these simulated cm numbers to test different colors!
const barangayFloodLevels = {
    "Biñan": 120, "Bungahan": 50, "Canlalay": 260, "Casile": 15, "De La Paz": 190,
    "Ganado": 210, "Langkiwa": 85, "Loma": 110, "Malaban": 280, "Malamig": 300,
    "Mampalasan": 95, "Platero": 140, "Poblacion": 160, "San Antonio": 240,
    "San Francisco": 130, "San Jose": 40, "San Vicente": 185, "Santo Domingo": 20,
    "Santo Niño": 270, "Santo Tomas": 225, "Soro-Soro": 60, "Timbao": 105,
    "Tubigan": 70, "Zapote": 195
};

const barangayList = Object.keys(barangayFloodLevels);
let geojsonLayer;
const barangayLayersMap = {}; 
let activeSearchQuery = "";
let activeFloodTier = "ALL";

function cleanName(name) {
    if (!name) return "";
    return name.replace(" (Pob.)", "").replace(" (Halang)", "").replace(" (Calabuso)", "").replace("Dela Paz", "De La Paz").replace("Soro-soro", "Soro-Soro").trim();
}

// Converts metric cm brackets into structured categorization identifiers
function getFloodTier(depth) {
    if (depth > 250) return "CRITICAL";
    if (depth >= 181) return "HIGH";
    if (depth >= 101) return "MODERATE";
    return "SAFE";
}

// Custom design color scales tailored exactly to your criteria rules
function getFloodColor(depth) {
    if (depth === undefined || depth === null) return '#d9d9d9';
    if (depth > 250) return '#e74c3c';  // Critical (Red)
    if (depth >= 181) return '#e67e22'; // High (Orange)
    if (depth >= 101) return '#f1c40f'; // Moderate (Yellow)
    return '#2ecc71';                   // Safe (Green)
}

// String Distance Algorithm (Levenshtein) for smart fuzzy typo detection
function getFuzzyDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

// 4. Dynamic Style Engine
function getFeatureStyle(feature) {
    const bgyName = cleanName(feature.properties.name || feature.properties.adm4_en);
    const depth = barangayFloodLevels[bgyName] ?? -1;
    const tier = getFloodTier(depth);

    const matchesSearch = activeSearchQuery === "" || bgyName.toLowerCase().includes(activeSearchQuery.toLowerCase());
    const matchesTier = activeFloodTier === "ALL" || tier === activeFloodTier;
    const isVisible = matchesSearch && matchesTier;

    return {
        fillColor: getFloodColor(depth),
        color: isVisible ? '#000000' : '#bdc3c7', 
        weight: isVisible ? 2.0 : 0.5,           
        opacity: isVisible ? 1.0 : 0.15,
        fillOpacity: isVisible ? 0.75 : 0.05      
    };
}

function updateMapFilters() {
    activeSearchQuery = document.getElementById('barangaySearch').value.trim();
    activeFloodTier = document.getElementById('floodFilter').value;

    let matchedLayers = [];

    geojsonLayer.eachLayer((layer) => {
        const bgyName = cleanName(layer.feature.properties.name || layer.feature.properties.adm4_en);
        const depth = barangayFloodLevels[bgyName] ?? -1;
        const tier = getFloodTier(depth);

        const matchesSearch = activeSearchQuery === "" || bgyName.toLowerCase().includes(activeSearchQuery.toLowerCase());
        const matchesTier = activeFloodTier === "ALL" || tier === activeFloodTier;

        layer.setStyle(getFeatureStyle(layer.feature));

        if (matchesSearch && matchesTier) {
            matchedLayers.push(layer);
        }
    });

    if (activeSearchQuery !== "" && matchedLayers.length === 1) {
        const targetLayer = matchedLayers[0];
        map.fitBounds(targetLayer.getBounds(), {
            paddingTopLeft: [340, 20], 
            paddingBottomRight: [20, 20],
            maxZoom: 15.5
        });
    }
}

// 5. Fetch Vector Boundaries & Map Events Setup
fetch('binan_barangays.geojson')
    .then(res => res.json())
    .then(geoData => {
        geojsonLayer = L.geoJson(geoData, {
            style: getFeatureStyle,
            onEachFeature: (feature, layer) => {
                const bgyName = cleanName(feature.properties.name || feature.properties.adm4_en);
                barangayLayersMap[bgyName.toLowerCase()] = layer;
                const currentDepth = barangayFloodLevels[bgyName] !== undefined ? `${barangayFloodLevels[bgyName]} cm` : 'No Data';
                
                layer.bindTooltip(`
                    <div style="font-family: sans-serif; padding: 2px 4px; line-height: 1.4;">
                        <b>Barangay:</b> ${bgyName}<br>
                        <b>Flood Depth:</b> <span style="font-weight:bold; color:${getFloodColor(barangayFloodLevels[bgyName])}">${currentDepth}</span>
                    </div>
                `, { sticky: true, direction: 'auto', opacity: 0.95 });
                
                layer.on('mouseover', () => {
                    document.getElementById('hover-info').innerHTML = `
                        <b>Barangay:</b> ${bgyName}<br>
                        <b>Flood Depth:</b> <span style="font-weight:bold; color:${getFloodColor(barangayFloodLevels[bgyName])}">${currentDepth}</span>
                    `;
                    const depth = barangayFloodLevels[bgyName] ?? -1;
                    const tier = getFloodTier(depth);
                    if ((activeSearchQuery === "" || bgyName.toLowerCase().includes(activeSearchQuery.toLowerCase())) && (activeFloodTier === "ALL" || tier === activeFloodTier)) {
                        layer.setStyle({ weight: 3.5, color: '#000000' });
                    }
                });
                
                layer.on('mouseout', () => {
                    document.getElementById('hover-info').innerHTML = `Hover over a barangay`;
                    geojsonLayer.resetStyle(layer);
                    updateMapFilters(); 
                });
            }
        }).addTo(map);

        map.invalidateSize();
        map.fitBounds(geojsonLayer.getBounds(), { paddingTopLeft: [340, 20], paddingBottomRight: [20, 20] });
        map.setMaxBounds(geojsonLayer.getBounds().pad(0.4));
    })
    .catch(err => console.error("Error configuration loading:", err));

// 6. FLOATING FLOOD KEY LEGEND PANEL
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    
    div.style.background = 'white';
    div.style.padding = '12px 15px';
    div.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
    div.style.fontSize = '12px';
    div.style.lineHeight = '20px';
    div.style.color = '#333';
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    div.style.border = '1px solid rgba(0,0,0,0.1)';

    div.innerHTML = `<h4 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight:700;">Flood Status</h4>`;

    const statusGrades = [
        { label: 'Critical (> 250 cm)', color: '#e74c3c' },
        { label: 'High (181 – 250 cm)', color: '#e67e22' },
        { label: 'Moderate (101 – 180 cm)', color: '#f1c40f' },
        { label: 'Safe (0 – 100 cm)', color: '#2ecc71' }
    ];

    statusGrades.forEach(grade => {
        div.innerHTML += `
            <div style="display: flex; align-items: center; margin-bottom: 4px; gap: 8px;">
                <i style="width: 16px; height: 16px; display: inline-block; background: ${grade.color}; border-radius: 4px; border: 1px solid rgba(0,0,0,0.15);"></i>
                <span style="font-weight: 500; color: #444;">${grade.label}</span>
            </div>
        `;
    });

    return div;
};

legend.addTo(map);

// 7. Suggestion Engine Event Listeners
const searchInput = document.getElementById('barangaySearch');
const suggestionsBox = document.getElementById('suggestions');

searchInput.addEventListener('input', () => {
    const value = searchInput.value.trim().toLowerCase();
    suggestionsBox.innerHTML = '';

    if (!value) {
        suggestionsBox.style.display = 'none';
        return;
    }

    let matches = barangayList.filter(bgy => bgy.toLowerCase().includes(value));

    if (matches.length === 0) {
        matches = barangayList
            .map(bgy => ({ name: bgy, distance: getFuzzyDistance(value, bgy) }))
            .filter(item => item.distance <= 3) 
            .sort((a, b) => a.distance - b.distance)
            .map(item => item.name);
    }

    if (matches.length > 0) {
        suggestionsBox.style.display = 'block';
        matches.forEach(matchName => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = matchName;
            div.addEventListener('click', () => {
                searchInput.value = matchName;
                suggestionsBox.style.display = 'none';
                updateMapFilters(); 
            });
            suggestionsBox.appendChild(div);
        });
    } else {
        suggestionsBox.style.display = 'block';
        const div = document.createElement('div');
        div.className = 'suggestion-no-match';
        div.textContent = 'No barangay found';
        suggestionsBox.appendChild(div);
    }
});

document.addEventListener('click', (e) => {
    if (e.target !== searchInput) suggestionsBox.style.display = 'none';
});

document.getElementById('btnAction').addEventListener('click', updateMapFilters);

document.getElementById('btnReset').addEventListener('click', () => {
    searchInput.value = "";
    document.getElementById('floodFilter').value = "ALL";
    suggestionsBox.innerHTML = '';
    suggestionsBox.style.display = 'none';
    updateMapFilters();
    map.fitBounds(geojsonLayer.getBounds(), { paddingTopLeft: [340, 20], paddingBottomRight: [20, 20] });
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        suggestionsBox.style.display = 'none';
        updateMapFilters();
    }
});