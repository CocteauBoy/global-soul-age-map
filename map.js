const soulColors = {
  infant: "#FF0000",
  baby: "#FFA500",
  young: "#FFFF00",
  mature: "#008000",
  old: "#0000FF",
  unknown: "#333333"
};

// Convert hex to RGB
function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

// Weighted color blending
function blendColor(data) {
  let total = 0;
  let r = 0, g = 0, b = 0;

  ["infant", "baby", "young", "mature", "old"].forEach(age => {
    const weight = data[age] || 0;
    if (weight > 0) {
      const color = hexToRgb(soulColors[age]);
      r += color.r * weight;
      g += color.g * weight;
      b += color.b * weight;
      total += weight;
    }
  });

  if (total === 0) return soulColors.unknown;

  return rgbToHex(
    Math.round(r / total),
    Math.round(g / total),
    Math.round(b / total)
  );
}

// Initialize map
const map = L.map("map", {
  zoomControl: true,
  attributionControl: false
}).setView([20, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 6
}).addTo(map);

// Load data
Promise.all([
  fetch("world.geojson").then(res => res.json()),
  fetch("soul_age_data.json").then(res => res.json())
]).then(([geoData, soulData]) => {

  const soulLookup = {};
  soulData.forEach(c => {
    soulLookup[c.iso] = c;
  });

  function style(feature) {
    const data = soulLookup[feature.id];
    const fillColor = data ? blendColor(data) : soulColors.unknown;

    return {
      fillColor: fillColor,
      weight: 1,
      color: "#222",
      fillOpacity: 0.85
    };
  }

  function onEachFeature(feature, layer) {
    const data = soulLookup[feature.id];

    if (data) {
      const breakdown = `
        <strong>${data.country}</strong><br>
        Infant: ${data.infant || 0}%<br>
        Baby: ${data.baby || 0}%<br>
        Young: ${data.young || 0}%<br>
        Mature: ${data.mature || 0}%<br>
        Old: ${data.old || 0}%<br>
        <em>${data.notes || ""}</em>
      `;
      layer.bindTooltip(breakdown);
    } else {
      layer.bindTooltip(`<strong>${feature.properties.name}</strong><br>No data`);
    }
  }

  L.geoJSON(geoData, {
    style,
    onEachFeature
  }).addTo(map);
});

