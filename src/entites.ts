import { findKGMID, KGMID_OVERRIDES } from "./kgmid.js";
import { findItem, fetchItemEntites } from "./wikidata.js";
import { findLinkedEntities, type MBEntity } from "./mb.js";

export async function getEntities(doc: Document): Promise<MBEntity[]> {
    const kgmid = findKGMID(doc);
    console.log(kgmid);
    if (kgmid === null) return await findLinkedEntities(doc);

    if (Object.keys(KGMID_OVERRIDES).includes(kgmid)) return KGMID_OVERRIDES[kgmid];

    const item = await findItem(kgmid);
    console.log(item);
    if (item !== null) return await fetchItemEntites(item);

    return await findLinkedEntities(doc);
}
