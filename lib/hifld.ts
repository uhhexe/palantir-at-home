export interface HifldLayerConfig {
  id: string;
  name: string;
  group: string;
  baseUrl: string;
  color: string;
  markerType: "circle" | "diamond" | "square" | "triangle";
  maxResults?: number;
  popupFields?: string[];
  stateField?: string;
}

export const HIFLD_LAYERS: HifldLayerConfig[] = [
  // ENERGY
  {
    id: "power-plants",
    name: "Power Plants",
    group: "energy",
    baseUrl:
      "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/Power_Plants_in_the_US/FeatureServer/0/query",
    color: "#f5a623",
    markerType: "diamond",
    popupFields: ["Plant_Name", "PrimSource", "Total_MW", "State"],
    stateField: "State",
  },
  {
    id: "nuclear-plants",
    name: "Nuclear Facilities",
    group: "energy",
    baseUrl:
      "https://gis.fema.gov/arcgis/rest/services/Partner/Nuclear_Plant_Power_Reactor_Status/FeatureServer/0/query",
    color: "#ff2b4e",
    markerType: "triangle",
    popupFields: ["power_plant", "reactor_name", "state", "status", "power", "owner_operator"],
    stateField: "state",
  },
  {
    id: "oil-refineries",
    name: "Oil Refineries",
    group: "energy",
    baseUrl:
      "https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/Oil_Refineries/FeatureServer/0/query",
    color: "#f5a623",
    markerType: "diamond",
    popupFields: ["NAME", "CITY", "STATE", "COUNTY"],
    stateField: "STATE",
  },
  // INFRASTRUCTURE
  {
    id: "gas-pipelines",
    name: "Natural Gas Pipelines",
    group: "infrastructure",
    baseUrl:
      "https://services2.arcgis.com/LYMgRMwHfrWWEg3s/arcgis/rest/services/HIFLD_US_Natural_Gas_Liquid_Pipelines/FeatureServer/0/query",
    color: "#f5a623",
    markerType: "circle",
    maxResults: 2000,
    popupFields: ["OperatorNa"],
  },
  {
    id: "transmission-lines",
    name: "Electric Transmission Lines",
    group: "infrastructure",
    baseUrl:
      "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0/query",
    color: "#f5a623",
    markerType: "circle",
    maxResults: 2000,
    popupFields: ["OWNER", "VOLTAGE", "STATUS"],
  },
  {
    id: "dams",
    name: "Dams",
    group: "infrastructure",
    baseUrl:
      "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/NID_v1/FeatureServer/0/query",
    color: "#00b4ff",
    markerType: "square",
    maxResults: 2000,
    popupFields: ["NAME", "STATE", "OWNER_TYPES", "DAM_HEIGHT"],
    stateField: "STATE",
  },
  // EMERGENCY
  {
    id: "hospitals",
    name: "Hospitals",
    group: "emergency",
    baseUrl:
      "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/Hospitals2/FeatureServer/0/query",
    color: "#ff2b4e",
    markerType: "square",
    popupFields: ["NAME", "TYPE", "BEDS", "STATE", "CITY", "TRAUMA"],
    stateField: "STATE",
  },
  {
    id: "fire-stations",
    name: "Fire Stations",
    group: "emergency",
    baseUrl:
      "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/Fire_Stations2/FeatureServer/0/query",
    color: "#ff2b4e",
    markerType: "square",
    popupFields: ["NAME", "CITY", "STATE"],
    stateField: "STATE",
  },
  {
    id: "ems-stations",
    name: "EMS Stations",
    group: "emergency",
    baseUrl:
      "https://services1.arcgis.com/wQnFk5ouCfPzTlPw/arcgis/rest/services/Emergency_Medical_Service_EMS_Stations/FeatureServer/0/query",
    color: "#ff2b4e",
    markerType: "square",
    popupFields: ["NAME", "CITY", "STATE", "LEVEL_"],
    stateField: "STATE",
  },
  // TELECOM
  {
    id: "cell-towers",
    name: "Cellular Towers",
    group: "telecom",
    baseUrl:
      "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/Cellular_Towers_in_the_United_States/FeatureServer/0/query",
    color: "#8b5cf6",
    markerType: "triangle",
    maxResults: 2000,
    popupFields: ["Licensee", "Callsign"],
  },
];

export async function fetchHifldLayer(
  config: HifldLayerConfig,
  stateFilter?: string
): Promise<GeoJSON.FeatureCollection> {
  let where = "1=1";
  if (stateFilter && config.stateField) {
    where = `${config.stateField}='${stateFilter}'`;
  }

  const maxResults = config.maxResults || 2000;
  const url = `${config.baseUrl}?where=${encodeURIComponent(where)}&outFields=*&f=geojson&resultRecordCount=${maxResults}`;

  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) {
    throw new Error(`HIFLD ${config.id}: HTTP ${response.status}`);
  }
  return response.json();
}
