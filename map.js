const soulColors = {
  infant: "#FF0000",
  baby: "#FFA500",
  young: "#FFFF00",
  mature: "#008000",
  old: "#0000FF",
  unknown: "#333333"
};

let primaryOnly = false;
let currentFilter = "all";

function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

function getPrimaryAge(data) {
  let max = 0;
  let primary = null;

  ["infant", "baby", "young", "mature", "old"].forEach(age => {
    if ((data[age] || 0) > max) {
      max = data[age];
      primary = age;
    }
  });

  return primary;
}

function blendColor(data) {
  if (primaryOnly) {
    const primary = getPrimaryAge(data);
    return primary ? soulColors[primary] : soulColors.unknown;
  }

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

function createBar(label, value, color) {
  if (!value) return "";
  return `
    <div>
      <strong>${label}: ${value}%</strong>
      <div class="bar" style="width:${value}%; background:${color};"></div>
    </div>
  `;
}

const map = L.map("map").setView([20, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 6
}).addTo(map);

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

    if (!data) return {
      fillColor: soulColors.unknown,
      weight: 1,
      color: "#222",
      fillOpacity: 0.6
    };

    if (currentFilter !== "all" && !(data[currentFilter] > 0)) {
      return {
        fillColor: "#eeeeee",
        weight: 1,
        color: "#999",
        fillOpacity: 0.4
      };
    }

    return {
      fillColor: blendColor(data),
      weight: 1,
      color: "#222",
      fillOpacity: 0.85
    };
  }

  function onEachFeature(feature, layer) {
    const data = soulLookup[feature.id];

    layer.on("click", function () {
      const panel = document.getElementById("country-details");

      if (data) {
        panel.innerHTML = `
          <h3>${data.country}</h3>
          ${createBar("Infant", data.infant, soulColors.infant)}
          ${createBar("Baby", data.baby, soulColors.baby)}
          ${createBar("Young", data.young, soulColors.young)}
          ${createBar("Mature", data.mature, soulColors.mature)}
          ${createBar("Old", data.old, soulColors.old)}
          <p><em>${data.notes || ""}</em></p>
        `;
      } else {
        panel.innerHTML = `<h3>${feature.properties.name}</h3><p>No data available.</p>`;
      }
    });
  }

  const geoLayer = L.geoJSON(geoData, {
    style,
    onEachFeature
  }).addTo(map);

  document.getElementById("primary-toggle").addEventListener("change", e => {
    primaryOnly = e.target.checked;
    geoLayer.setStyle(style);
  });

  document.getElementById("age-filter").addEventListener("change", e => {
    currentFilter = e.target.value;
    geoLayer.setStyle(style);
  });

  document.getElementById("search").addEventListener("input", function () {
    const value = this.value.toLowerCase();
    geoLayer.eachLayer(layer => {
      const name = layer.feature.properties.name.toLowerCase();
      if (name.includes(value)) {
        layer.setStyle({ weight: 3 });
        map.fitBounds(layer.getBounds());
      }
    });
  });

});
