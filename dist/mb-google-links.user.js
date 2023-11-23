// ==UserScript==
// @name       mb-google-links
// @namespace  npm/vite-plugin-monkey
// @version    0.0.1
// @author     LeviOP
// @match      *://www.google.com/search?*
// @grant      GM_addStyle
// @grant      GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';

  var _GM_addStyle = /* @__PURE__ */ (() => typeof GM_addStyle != "undefined" ? GM_addStyle : void 0)();
  var _GM_xmlhttpRequest = /* @__PURE__ */ (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
  const KGMID_OVERRIDES = {
    "/g/11qryf2kc3": [{ id: "52faa157-6bad-4d86-a0ab-d4dec7d2513c", type: "genre" }],
    //Hip-Hop/Rap -> hip hop
    "/g/11qrycckfk": [{ id: "0e3fc579-2d24-4f20-9dae-736e1ec78798", type: "genre" }],
    //Rock (duplicate) -> rock
    "/g/11qry8b0b_": [{ id: "b739a895-85ed-4ad3-8717-4e9ef5387dd8", type: "genre" }],
    //Dance Pop (duplicate) -> dance-pop
    "/g/11ls8pnybf": [{ id: "93244085-20e5-4f16-9067-1d19143b3810", type: "genre" }],
    //Classic Rock (duplicate) -> classic rock
    "/g/11qrybl_27": [{ id: "5f665615-7fb3-49d8-b541-62a7b239edbe", type: "genre" }]
    //Country (duplicate) -> country
  };
  function findKGMID(doc) {
    var _a, _b;
    const scripts = Array.from(doc.querySelectorAll("script[nonce]") ?? []);
    if (scripts.length === 0)
      return null;
    const script = (_a = scripts.filter((e) => e.innerHTML.startsWith("(function(){google.kEXPI="))) == null ? void 0 : _a[0];
    if (script === void 0)
      return null;
    const string = (_b = script.innerHTML.match(/'\[null,\\x22(\/[mg]\/[^']+?)\\x22,\\x22[^']+?\\x22,null,\[(?:\\x22[^']+?\\x22,?)+],null,null,null,\\x22[^']+?\\x22,\\x22/)) == null ? void 0 : _b[1];
    if (string === void 0)
      return null;
    return string;
  }
  function findItem(kgmid) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        format: "json",
        query: `SELECT ?item WHERE { ?item (wdt:P646|wdt:P2671) "${kgmid}" }`
      });
      _GM_xmlhttpRequest({
        url: "https://query.wikidata.org/bigdata/namespace/wdq/sparql?" + params.toString(),
        responseType: "json",
        onload: (res) => {
          const results = res.response.results.bindings;
          if (results.length === 0)
            return resolve(null);
          const url = new URL(results[0].item.value);
          const id = url.pathname.split("/").at(-1) ?? null;
          resolve(id);
        }
      });
    });
  }
  const MB_PROPERTIES = {
    "P434": "artist",
    "P436": "release_group",
    "P982": "area",
    "P1004": "place",
    "P966": "label",
    "P435": "work",
    "P1330": "instrument",
    "P1407": "series",
    "P6423": "event",
    "P4404": "recording",
    "P5813": "release",
    "P8052": "genre"
  };
  function fetchItemEntites(item) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        format: "json",
        query: `SELECT ?property ?value WHERE { VALUES ?property { ${Object.keys(MB_PROPERTIES).map((p) => "wdt:" + p).join(" ")} } wd:${item} ?property ?value }`
      });
      _GM_xmlhttpRequest({
        url: "https://query.wikidata.org/bigdata/namespace/wdq/sparql?" + params.toString(),
        responseType: "json",
        onload: ({ response }) => {
          const results = response.results.bindings;
          if (results.length === 0)
            return resolve([]);
          const entities = results.map((r) => {
            const property = r.property.value.split("/").at(-1);
            return {
              id: r.value.value,
              type: MB_PROPERTIES[property]
            };
          });
          resolve(entities);
        }
      });
    });
  }
  async function findLinkedEntities(doc) {
    var _a;
    const listenUrlEntities = await findLinkedListenUrl(doc);
    if (listenUrlEntities.length !== 0)
      return listenUrlEntities;
    const officalSiteUrl = (_a = doc.querySelector("a[data-attrid='visit_official_site']")) == null ? void 0 : _a.href;
    if (officalSiteUrl !== void 0) {
      const id = await searchURL(officalSiteUrl);
      if (id === null)
        return [];
      const entities = await getEntitiesFromURL(id);
      return entities;
    }
    return [];
  }
  const STREAMING_HOSTNAMES = {
    "open.spotify.com": (u) => u.origin + u.pathname
  };
  async function findLinkedListenUrl(doc) {
    const streamingElements = doc.querySelectorAll("[data-attrid^='action:listen'] > div > div > div > div > div > a");
    if (streamingElements === null)
      return [];
    const urls = Array.from(streamingElements).map((e) => e.href);
    const links = urls.reduce((prev, curr) => {
      const url = new URL(curr);
      const hostname = url.hostname;
      if (Object.keys(STREAMING_HOSTNAMES).includes(hostname))
        return [...prev, STREAMING_HOSTNAMES[hostname](url)];
      return prev;
    }, []);
    const entities = await Promise.all(links.map(async (link) => {
      const id = await searchURL(link);
      if (id === null)
        return [];
      const entities2 = await getEntitiesFromURL(id);
      return entities2;
    }));
    return entities.flat();
  }
  function searchURL(string) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        fmt: "json",
        query: string,
        limit: "1"
      });
      _GM_xmlhttpRequest({
        url: "https://musicbrainz.org/ws/2/url/?" + params.toString(),
        responseType: "json",
        onload: ({ response }) => {
          const mburl = response.urls[0];
          if (mburl.score !== 100)
            return resolve(null);
          const url = new URL(mburl.resource);
          const searchUrl = new URL(string);
          if (url.hostname !== searchUrl.hostname)
            return resolve(null);
          resolve(mburl.id);
        }
      });
    });
  }
  async function getEntitiesFromURL(id) {
    const url = await fetchURL(id);
    const entities = await Promise.all(url.relations.map(async (relationship) => {
      const type = relationship["target-type"];
      const id2 = relationship[type].id;
      if (type === "release") {
        const releaseGroup = await getReleaseGroupFromRelease(id2);
        return { id: releaseGroup, type: "release_group" };
      }
      return { id: id2, type };
    }));
    return entities;
  }
  function fetchURL(id) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        fmt: "json",
        inc: "area-rels+artist-rels+event-rels+instrument-rels+label-rels+place-rels+recording-rels+release-rels+release-group-rels+series-rels+url-rels+work-rels"
      });
      console.log(`https://musicbrainz.org/ws/2/url/${id}?${params.toString()}`);
      _GM_xmlhttpRequest({
        url: `https://musicbrainz.org/ws/2/url/${id}?${params.toString()}`,
        responseType: "json",
        onload: ({ response }) => {
          resolve(response);
        }
      });
    });
  }
  function getReleaseGroupFromRelease(id) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        fmt: "json",
        inc: "release-groups"
      });
      _GM_xmlhttpRequest({
        url: `https://musicbrainz.org/ws/2/release/${id}?${params.toString()}`,
        responseType: "json",
        onload: ({ response: json }) => {
          const group = json["release-group"];
          if (group === void 0)
            return resolve(null);
          resolve(group.id);
        }
      });
    });
  }
  async function getEntities(doc) {
    const kgmid = findKGMID(doc);
    console.log(kgmid);
    if (kgmid === null)
      return await findLinkedEntities(doc);
    if (Object.keys(KGMID_OVERRIDES).includes(kgmid))
      return KGMID_OVERRIDES[kgmid];
    const item = await findItem(kgmid);
    console.log(item);
    if (item !== null)
      return await fetchItemEntites(item);
    return await findLinkedEntities(doc);
  }
  async function accumulateLinks(doc) {
    console.log("accumulateLinks");
    const sidebarSections = getSidebarSections(doc);
    console.log("sidebarSections:", sidebarSections);
    const aboutSection = sidebarSections.find((section) => section.matches("div:has(> div > div > div > div > div > div > div[data-attrid])"));
    if (aboutSection === void 0)
      return [];
    const anchorElements = Array.from(aboutSection.querySelectorAll("a[href]"));
    const links = anchorElements.map(async (element) => {
      if (element.textContent === "MORE")
        return { element, entities: [] };
      const url = new URL(element.href);
      if (url.hostname === "www.google.com" && url.pathname === "/search") {
        const doc2 = await fetchResult(element.href);
        if (doc2 === null)
          return { element, entities: [] };
        const entities = await getEntities(doc2);
        return { element, entities };
      }
      return { element, entities: [] };
    });
    return links;
  }
  function getSidebarSections(doc) {
    const sections = doc.querySelectorAll("#rhs > div:not(.focusSentinel):not(:empty)");
    if (sections.length === 1 && doc.querySelectorAll("#rhs > div > div > div > div > div > div > div > div#kp-wp-tab-overview > div, #rhs > div > div > div > div > div > div > div#kp-wp-tab-cont-overview > div > div > div").length > 0)
      return Array.from(doc.querySelectorAll("#rhs > div > div > div > div > div > div > div > div#kp-wp-tab-overview > div, #rhs > div > div > div > div > div > div > div#kp-wp-tab-cont-overview > div > div > div"));
    return Array.from(sections);
  }
  function fetchResult(url) {
    return new Promise((resolve) => {
      _GM_xmlhttpRequest({
        url,
        onload: ({ responseXML }) => resolve(responseXML)
      });
    });
  }
  function addLinks(element, entities) {
    const icons = entities.map((e) => elementFromHTML(`<a class="mb-link" href="https://musicbrainz.org/${e.type.replace("_", "-")}/${e.id}"><img src="https://musicbrainz.org/static/images/entity/${e.type}.svg"></a>`));
    icons.forEach((icon) => element.insertAdjacentElement("beforebegin", icon));
  }
  function elementFromHTML(html) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }
  async function handleMain(doc) {
    console.log("handle main");
    const entities = await getEntities(doc);
    console.log(entities);
    const possibleTitles = [
      ...doc.querySelectorAll("div[data-attrid='title'], div[data-attrid='title'] > span, h2[data-attrid='title'] > span"),
      ...doc.querySelectorAll("a:has(> div[data-attrid='title'])")
    ];
    console.log(possibleTitles);
    const element = possibleTitles.at(-1);
    console.log(element);
    if (element === void 0)
      return;
    addLinks(element, entities);
  }
  async function handleSidebar(doc) {
    console.log("handle sidebar");
    const links = await accumulateLinks(doc);
    links.forEach((link) => link.then(({ element, entities }) => addLinks(element, entities)));
  }
  function start() {
    handleMain(document);
    handleSidebar(document);
    _GM_addStyle(`
        div[data-attrid="title"] > .mb-link > img {
            height: 32px;
            margin-bottom: -5px;
        }
        div:has(> .mb-link) {
            display: contents;
        }
        div:not(:has(> div[data-attrid="title"])) > .mb-link > img, h2[data-attrid="title"] > .mb-link > img {
            height: 32px;
            margin-bottom: -7px;
        }
        div:has(> div[data-attrid="title"]) > .mb-link > img {
            height: 32px;
        }
        span > .mb-link > img {
            height: 22px;
            margin-bottom: -6px;
        }
    `);
  }
  start();

})();