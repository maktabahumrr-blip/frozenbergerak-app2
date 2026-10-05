import { DeliveryAgent } from "../types";

export const DELIVERY_AGENTS: DeliveryAgent[] = [
  {
    id: "area-putrajaya-cyberjaya",
    name: "Team Putrajaya & Cyberjaya",
    area: "Kawasan Putrajaya & Cyberjaya",
    phone: "60123456789",
    coverage: "Presint 1-20, Cyberjaya, Dengkil & Sepang",
  },
  {
    id: "area-shahalam-klang",
    name: "Team Shah Alam & Klang",
    area: "Kawasan Shah Alam & Klang",
    phone: "60198765432",
    coverage: "Seksyen 1-36, Setia Alam, Bukit Raja & Kota Kemuning",
  },
  {
    id: "area-bangi-kajang",
    name: "Team Bangi & Kajang",
    area: "Kawasan Bangi, Kajang & Semenyih",
    phone: "60112345678",
    coverage: "Bandar Baru Bangi, Kajang Perdana, Sg Ramal & Semenyih",
  },
  {
    id: "area-kl-pj",
    name: "Team KL & Petaling Jaya",
    area: "Kawasan Kuala Lumpur & Petaling Jaya",
    phone: "60187654321",
    coverage: "Cheras, Ampang, Wangsa Maju, Bangsar & Petaling Jaya",
  },
];

export const DEFAULT_DELIVERY_AGENT = DELIVERY_AGENTS[0];
