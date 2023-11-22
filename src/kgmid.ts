import { MBEntity } from "./mb.js";

export const KGMID_OVERRIDES: Record<string, MBEntity[]> = {
    "/g/11qryf2kc3": [{ id: "52faa157-6bad-4d86-a0ab-d4dec7d2513c", type: "genre" }], //Hip-Hop/Rap -> hip hop
    "/g/11qrycckfk": [{ id: "0e3fc579-2d24-4f20-9dae-736e1ec78798", type: "genre" }], //Rock (duplicate) -> rock
    "/g/11qry8b0b_": [{ id: "b739a895-85ed-4ad3-8717-4e9ef5387dd8", type: "genre" }], //Dance Pop (duplicate) -> dance-pop
    "/g/11ls8pnybf": [{ id: "93244085-20e5-4f16-9067-1d19143b3810", type: "genre" }], //Classic Rock (duplicate) -> classic rock
    "/g/11qrybl_27": [{ id: "5f665615-7fb3-49d8-b541-62a7b239edbe", type: "genre" }]  //Country (duplicate) -> country
};

// Get knowledge graph machine id from google search result
export function findKGMID(doc: Document): string | null {
    const scripts = Array.from(doc.querySelectorAll("script[nonce]") ?? []);
    if (scripts.length === 0) return null;
    const script = scripts.filter((e) => e.innerHTML.startsWith("(function(){google.kEXPI="))?.[0];
    if (script === undefined) return null;
    const string = script.innerHTML.match(/'\[null,\\x22(\/[mg]\/[^']+?)\\x22,\\x22[^']+?\\x22,null,\[(?:\\x22[^']+?\\x22,?)+],null,null,null,\\x22[^']+?\\x22,\\x22/)?.[1];
    if (string === undefined) return null;
    return string;
}
