import { AgentContact, DeliveryAgent, DeliveryArea } from "../types";

export const AGENT_CONTACTS: Record<"HUSNA" | "AHDA" | "IZYAN" | "ALIA", AgentContact> = {
  HUSNA: { id: "husna", name: "HUSNA", phone: "60136863099" },
  AHDA: { id: "ahda", name: "AHDA", phone: "60198754912" },
  IZYAN: { id: "izyan", name: "IZYAN", phone: "60132036230" },
  ALIA: { id: "alia", name: "ALIA", phone: "60148377488" },
};

export const TEAM_WHATSAPP_CONTACTS: AgentContact[] = [
  { id: "izyan", name: "Izyan", phone: AGENT_CONTACTS.IZYAN.phone },
  { id: "ahda", name: "Ahda", phone: AGENT_CONTACTS.AHDA.phone },
  { id: "husna", name: "Husna", phone: AGENT_CONTACTS.HUSNA.phone },
  { id: "alia", name: "Alia", phone: AGENT_CONTACTS.ALIA.phone },
];

export const DELIVERY_AREAS: DeliveryArea[] = [
  {
    id: "nilai",
    name: "NILAI",
    agents: [AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.AHDA, AGENT_CONTACTS.IZYAN, AGENT_CONTACTS.ALIA],
  },
  {
    id: "seremban-senawang",
    name: "SEREMBAN/SENAWANG",
    agents: [AGENT_CONTACTS.AHDA, AGENT_CONTACTS.IZYAN],
  },
  {
    id: "seri-putra-bukit-mahkota",
    name: "SERI PUTRA/BUKIT MAHKOTA",
    agents: [AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.IZYAN],
  },
  {
    id: "salak-bbst-sepang",
    name: "SALAK/BBST/SEPANG",
    agents: [AGENT_CONTACTS.AHDA, AGENT_CONTACTS.IZYAN, AGENT_CONTACTS.ALIA],
  },
  {
    id: "kota-warisan-dengkil",
    name: "KOTA WARISAN/DENGKIL",
    agents: [AGENT_CONTACTS.AHDA, AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.IZYAN],
  },
  {
    id: "jenderam",
    name: "JENDERAM",
    agents: [AGENT_CONTACTS.AHDA],
  },
  {
    id: "langat-murni-olak-lempit-banting",
    name: "LANGAT MURNI/OLAK LEMPIT/BANTING",
    agents: [AGENT_CONTACTS.AHDA],
  },
  {
    id: "teluk-panglima-garang",
    name: "TELUK PANGLIMA GARANG",
    agents: [AGENT_CONTACTS.AHDA],
  },
  {
    id: "putrajaya-cyberjaya",
    name: "PUTRAJAYA/CYBERJAYA",
    agents: [AGENT_CONTACTS.IZYAN, AGENT_CONTACTS.ALIA],
  },
  {
    id: "puchong-puj-lestari",
    name: "PUCHONG/PUJ/LESTARI",
    agents: [AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.IZYAN],
  },
  {
    id: "bangi",
    name: "BANGI",
    agents: [AGENT_CONTACTS.AHDA, AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.IZYAN],
  },
  {
    id: "kajang",
    name: "KAJANG",
    agents: [AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.AHDA, AGENT_CONTACTS.IZYAN, AGENT_CONTACTS.ALIA],
  },
  {
    id: "serdang-sri-kembangan",
    name: "SERDANG/SRI KEMBANGAN",
    agents: [AGENT_CONTACTS.AHDA, AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.IZYAN],
  },
  {
    id: "cheras-btho-alam-damai",
    name: "CHERAS/BTHO/ALAM DAMAI",
    agents: [AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.ALIA],
  },
  {
    id: "kuala-lumpur",
    name: "KUALA LUMPUR",
    agents: [AGENT_CONTACTS.IZYAN],
  },
  {
    id: "bdr-saujana-putra",
    name: "BDR SAUJANA PUTRA",
    agents: [AGENT_CONTACTS.IZYAN, AGENT_CONTACTS.AHDA, AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.ALIA],
  },
  {
    id: "putra-heights-usj",
    name: "PUTRA HEIGHTS/USJ",
    agents: [AGENT_CONTACTS.IZYAN, AGENT_CONTACTS.AHDA, AGENT_CONTACTS.HUSNA],
  },
  {
    id: "klang",
    name: "KLANG",
    agents: [AGENT_CONTACTS.HUSNA, AGENT_CONTACTS.AHDA],
  },
  {
    id: "shah-alam",
    name: "SHAH ALAM",
    agents: [AGENT_CONTACTS.AHDA, AGENT_CONTACTS.ALIA],
  },
  {
    id: "bukit-jelutong-denai-alam-alam-idaman",
    name: "BUKIT JELUTONG/DENAI ALAM/ALAM IDAMAN",
    agents: [AGENT_CONTACTS.AHDA, AGENT_CONTACTS.ALIA],
  },
];

export const DEFAULT_DELIVERY_AREA = DELIVERY_AREAS[0];

export const DELIVERY_AGENTS: DeliveryAgent[] = DELIVERY_AREAS.flatMap((area) =>
  area.agents.map((agent) => ({
    id: `${area.id}__${agent.id}`,
    name: agent.name,
    area: area.name,
    phone: agent.phone,
  }))
);

export const DEFAULT_DELIVERY_AGENT: DeliveryAgent = DELIVERY_AGENTS[0];

