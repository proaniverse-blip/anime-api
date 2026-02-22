
import util from "util";
import pixels from "image-pixels";
import cryptoJs from "crypto-js";
import axios from '../utils/axiosWrapper.js';
// import { webcrypto } from "crypto";
// const crypto = webcrypto;
// Node 18+ has global crypto
const crypto = globalThis.crypto;

const user_agent = "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0";

// --- Wasm Loader & Fake Window Logic ---
let wasm;
let arr = new Array(128).fill(void 0);
const dateNow = Date.now();
let content;
let referrer = "";

const meta = { content: content };
const image_data = { height: 50, width: 65, data: new Uint8ClampedArray() };
const canvas = {
    baseUrl: "",
    width: 0,
    height: 0,
    style: { style: { display: "inline" } },
    context2d: {},
};
const nodeList = {
    image: { src: "", height: 50, width: 65, complete: true },
    context2d: {},
    length: 1,
};

// Fake Window
const fake_window = {
    localStorage: {
        setItem: function (item, value) {
            fake_window.localStorage[item] = value;
        },
    },
    navigator: { webdriver: false, userAgent: user_agent },
    length: 0,
    document: { cookie: "" },
    origin: "",
    location: { href: "", origin: "" },
    performance: { timeOrigin: dateNow },
    xrax: "",
    c: false,
    G: "",
    z: function (a) {
        return [(4278190080 & a) >> 24, (16711680 & a) >> 16, (65280 & a) >> 8, 255 & a];
    },
    crypto: crypto,
    msCrypto: crypto,
    browser_version: 1676800512,
    bytes: null,
    jwt_plugin: function () { }, // Placeholder
    navigate: function () { } // Placeholder
};

// --- Wasm Imports & Helpers ---
function get(index) { return arr[index]; }
arr.push(void 0, null, true, false);
let size = 0;
let memoryBuff;
function getMemBuff() {
    return (memoryBuff = null !== memoryBuff && 0 !== memoryBuff.byteLength ? memoryBuff : new Uint8Array(wasm.memory.buffer));
}
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function parse(text, func, func2) {
    // Simplified parse from original
    // ... (This function mimics the text encoder behavior in the wasm binder)
    // For brevity, assuming text is short ascii or handled correctly
    // The original function is complex to handle writes to WASM memory
    // copying verbatim is safest
    if (void 0 === func2) {
        var encoded = encoder.encode(text);
        const parsedIndex = func(encoded.length, 1) >>> 0;
        return (
            getMemBuff().subarray(parsedIndex, parsedIndex + encoded.length).set(encoded),
            (size = encoded.length),
            parsedIndex
        );
    }
    let len = text.length;
    let parsedLen = func(len, 1) >>> 0;
    var new_arr = getMemBuff();
    let i = 0;
    for (; i < len; i++) {
        var char = text.charCodeAt(i);
        if (127 < char) break;
        new_arr[parsedLen + i] = char;
    }
    // if complex chars, handle... omitted for now assuming basic strings
    return parsedLen;
}
// Actually, I should verify 'parse' logic isn't critical for subtle key generation. 
// Re-using the exact logic from megacloud to be safe.
function parse_full(text, func, func2) {
    if (void 0 === func2) {
        var encoded = encoder.encode(text);
        const parsedIndex = func(encoded.length, 1) >>> 0;
        return (getMemBuff().subarray(parsedIndex, parsedIndex + encoded.length).set(encoded), (size = encoded.length), parsedIndex);
    }
    let len = text.length;
    let parsedLen = func(len, 1) >>> 0;
    var new_arr = getMemBuff();
    let i = 0;
    for (; i < len; i++) {
        var char = text.charCodeAt(i);
        if (127 < char) { break; }
        new_arr[parsedLen + i] = char;
    }
    return (i !== len && (0 !== i && (text = text.slice(i)), (parsedLen = func2(parsedLen, len, (len = i + 3 * text.length), 1) >>> 0), (encoded = getMemBuff().subarray(parsedLen + i, parsedLen + len)), (i += encoder.encodeInto(text, encoded).written), (parsedLen = func2(parsedLen, len, i, 1) >>> 0)), (size = i), parsedLen);
}


let dataView;
function getDataView() {
    return (dataView = dataView === null || dataView?.buffer !== wasm.memory.buffer ? new DataView(wasm.memory.buffer) : dataView);
}
let pointer = arr.length;
function shift(QP) { QP < 132 || ((arr[QP] = pointer), (pointer = QP)); }
function shiftGet(QP) { var Qn = get(QP); return shift(QP), Qn; }
function decodeSub(index, offset) { return (index >>>= 0), decoder.decode(getMemBuff().subarray(index, index + offset)); }
function addToStack(item) { pointer === arr.length && arr.push(arr.length + 1); var Qn = pointer; return (pointer = arr[Qn]), (arr[Qn] = item), Qn; }
function args(QP, Qn, QT, func) {
    const Qx = { a: QP, b: Qn, cnt: 1, dtor: QT };
    return ((QP = (...Qw) => { Qx.cnt++; try { return func(Qx.a, Qx.b, ...Qw); } finally { 0 == --Qx.cnt && (wasm.__wbindgen_export_2.get(Qx.dtor)(Qx.a, Qx.b), (Qx.a = 0)); } }), ((QP.original = Qx), QP));
}
function export3(QP, Qn) { return shiftGet(wasm.__wbindgen_export_3(QP, Qn)); }
function export4(Qy, QO, QX) { wasm.__wbindgen_export_4(Qy, QO, addToStack(QX)); }
function export5(QP, Qn) { wasm.__wbindgen_export_5(QP, Qn); }
function applyToWindow(func, args) {
    try { return func.apply(fake_window, args); } catch (error) { wasm.__wbindgen_export_6(addToStack(error)); }
}
function isNull(test) { return null == test; }
function Qj(QP, Qn) { return (Qn = Qn(+QP.length, 1) >>> 0), (getMemBuff().set(QP, Qn), (size = QP.length), Qn); }

// WASM ENV OBJECT
function initWasm() {
    return {
        wbg: {
            __wbindgen_is_function: (index) => typeof get(index) == "function",
            __wbindgen_is_string: (index) => typeof get(index) == "string",
            __wbindgen_is_object: (index) => typeof get(index) == "object" && get(index) !== null,
            __wbindgen_number_get: (offset, index) => { let number = get(index); getDataView().setFloat64(offset + 8, isNull(number) ? 0 : number, true); getDataView().setInt32(offset, isNull(number) ? 0 : 1, true); },
            __wbindgen_string_get: (offset, index) => { let str = get(index); let val = parse_full(str, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1); getDataView().setInt32(offset + 4, size, true); getDataView().setInt32(offset, val, true); },
            __wbindgen_object_drop_ref: (index) => shiftGet(index),
            __wbindgen_cb_drop: (index) => { let org = shiftGet(index).original; return 1 == org.cnt-- && !(org.a = 0); },
            __wbindgen_string_new: (index, offset) => addToStack(decodeSub(index, offset)),
            __wbindgen_is_null: (index) => null === get(index),
            __wbindgen_is_undefined: (index) => void 0 === get(index),
            __wbindgen_boolean_get: (index) => { let bool = get(index); return "boolean" == typeof bool ? (bool ? 1 : 0) : 2; },
            __wbg_instanceof_CanvasRenderingContext2d_4ec30ddd3f29f8f9: () => true,
            __wbg_subarray_adc418253d76e2f1: (index, num1, num2) => addToStack(get(index).subarray(num1 >>> 0, num2 >>> 0)),
            __wbg_randomFillSync_5c9c955aa56b6049: () => { },
            __wbg_getRandomValues_3aa56aa6edec874c: function () { return applyToWindow(function (index1, index2) { get(index1).getRandomValues(get(index2)); }, arguments); },
            __wbg_msCrypto_eb05e62b530a1508: (index) => addToStack(get(index).msCrypto),
            __wbg_toString_6eb7c1f755c00453: (index) => addToStack("[object Storage]"),
            __wbg_toString_139023ab33acec36: (index) => addToStack(get(index).toString()),
            __wbg_require_cca90b1a94a0255b: function () { return applyToWindow(function () { return addToStack(module.require); }, arguments); },
            __wbg_crypto_1d1f22824a6a080c: (index) => addToStack(get(index).crypto),
            __wbg_process_4a72847cc503995b: (index) => addToStack(get(index).process),
            __wbg_versions_f686565e586dd935: (index) => addToStack(get(index).versions),
            __wbg_node_104a2ff8d6ea03a2: (index) => addToStack(get(index).node),
            __wbg_localStorage_3d538af21ea07fcc: function () { return applyToWindow(function (index) { let data = fake_window.localStorage; return isNull(data) ? 0 : addToStack(data); }, arguments); },
            __wbg_setfillStyle_59f426135f52910f: () => { },
            __wbg_setshadowBlur_229c56539d02f401: () => { },
            __wbg_setshadowColor_340d5290cdc4ae9d: () => { },
            __wbg_setfont_16d6e31e06a420a5: () => { },
            __wbg_settextBaseline_c3266d3bd4a6695c: () => { },
            __wbg_drawImage_cb13768a1bdc04bd: () => { },
            __wbg_getImageData_66269d289f37d3c7: function () { return applyToWindow(function () { return addToStack(image_data); }, arguments); },
            __wbg_rect_2fa1df87ef638738: () => { },
            __wbg_fillRect_4dd28e628381d240: () => { },
            __wbg_fillText_07e5da9e41652f20: () => { },
            __wbg_setProperty_5144ddce66bbde41: () => { },
            __wbg_createElement_03cf347ddad1c8c0: function () { return applyToWindow(function () { return addToStack(canvas); }, arguments); },
            __wbg_querySelector_118a0639aa1f51cd: function () { return applyToWindow(function () { return addToStack(meta); }, arguments); },
            __wbg_querySelectorAll_50c79cd4f7573825: function () { return applyToWindow(function () { return addToStack(nodeList); }, arguments); },
            __wbg_getAttribute_706ae88bd37410fa: function (offset, index) { let attr = meta.content; let todo = isNull(attr) ? 0 : parse_full(attr, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1); getDataView().setInt32(offset + 4, size, true); getDataView().setInt32(offset, todo, true); },
            __wbg_target_6795373f170fd786: (index) => { let target = get(index).target; return isNull(target) ? 0 : addToStack(target); },
            __wbg_addEventListener_f984e99465a6a7f4: () => { },
            __wbg_instanceof_HtmlCanvasElement_1e81f71f630e46bc: () => true,
            __wbg_setwidth_233645b297bb3318: (index, set) => { get(index).width = set >>> 0; },
            __wbg_setheight_fcb491cf54e3527c: (index, set) => { get(index).height = set >>> 0; },
            __wbg_getContext_dfc91ab0837db1d1: function () { return applyToWindow(function (index) { return addToStack(get(index).context2d); }, arguments); },
            __wbg_toDataURL_97b108dd1a4b7454: function () { return applyToWindow(function (offset, index) { let _dataUrl = parse_full("data:image/png;base64,FAKE", wasm.__wbindgen_export_0, wasm.__wbindgen_export_1); getDataView().setInt32(offset + 4, size, true); getDataView().setInt32(offset, _dataUrl, true); }, arguments); },
            __wbg_instanceof_HtmlDocument_1100f8a983ca79f9: () => true,
            __wbg_style_ca229e3326b3c3fb: (index) => { addToStack(get(index).style); },
            __wbg_instanceof_HtmlImageElement_9c82d4e3651a8533: () => true,
            __wbg_src_87a0e38af6229364: (offset, index) => { let _src = parse_full(get(index).src, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1); getDataView().setInt32(offset + 4, size, true); getDataView().setInt32(offset, _src, true); },
            __wbg_width_e1a38bdd483e1283: (index) => get(index).width,
            __wbg_height_e4cc2294187313c9: (index) => get(index).height,
            __wbg_complete_1162c2697406af11: (index) => get(index).complete,
            __wbg_data_d34dc554f90b8652: (offset, index) => { var _data = Qj(get(index).data, wasm.__wbindgen_export_0); getDataView().setInt32(offset + 4, size, true); getDataView().setInt32(offset, _data, true); },
            __wbg_origin_305402044aa148ce: function () { return applyToWindow(function (offset, index) { let _origin = parse_full(get(index).origin, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1); getDataView().setInt32(offset + 4, size, true); getDataView().setInt32(offset, _origin, true); }, arguments); },
            __wbg_length_8a9352f7b7360c37: (index) => get(index).length,
            __wbg_get_c30ae0782d86747f: (index) => { let _image = get(index).image; return isNull(_image) ? 0 : addToStack(_image); },
            __wbg_timeOrigin_f462952854d802ec: (index) => get(index).timeOrigin,
            __wbg_instanceof_Window_cee7a886d55e7df5: () => true,
            __wbg_document_eb7fd66bde3ee213: (index) => { let _document = get(index).document; return isNull(_document) ? 0 : addToStack(_document); },
            __wbg_location_b17760ac7977a47a: (index) => addToStack(get(index).location),
            __wbg_performance_4ca1873776fdb3d2: (index) => { let _performance = get(index).performance; return isNull(_performance) ? 0 : addToStack(_performance); },
            __wbg_origin_e1f8acdeb3a39a2b: (offset, index) => { let _origin = parse_full(get(index).origin, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1); getDataView().setInt32(offset + 4, size, true); getDataView().setInt32(offset, _origin, true); },
            __wbg_get_8986951b1ee310e0: (index, decode1, decode2) => { let data = get(index)[decodeSub(decode1, decode2)]; return isNull(data) ? 0 : addToStack(data); },
            __wbg_setTimeout_6ed7182ebad5d297: () => applyToWindow(() => 7, arguments),
            __wbg_self_05040bd9523805b9: () => applyToWindow(() => addToStack(fake_window), arguments),
            __wbg_window_adc720039f2cb14f: () => applyToWindow(() => addToStack(fake_window), arguments),
            __wbg_globalThis_622105db80c1457d: () => applyToWindow(() => addToStack(fake_window), arguments),
            __wbg_global_f56b013ed9bcf359: () => applyToWindow(() => addToStack(fake_window), arguments),
            __wbg_newnoargs_cfecb3965268594c: (index, offset) => addToStack(new Function(decodeSub(index, offset))),
            __wbindgen_object_clone_ref: (index) => addToStack(get(index)),
            __wbg_eval_c824e170787ad184: function () { return applyToWindow(function (index, offset) { let fake_str = "fake_" + decodeSub(index, offset); let ev = eval(fake_str); return addToStack(ev); }, arguments); },
            __wbg_call_3f093dd26d5569f8: function () { return applyToWindow(function (index, index2) { return addToStack(get(index).call(get(index2))); }, arguments); },
            __wbg_call_67f2111acd2dfdb6: function () { return applyToWindow(function (index, index2, index3) { return addToStack(get(index).call(get(index2), get(index3))); }, arguments); },
            __wbg_set_961700853a212a39: function () { return applyToWindow(function (index, index2, index3) { return Reflect.set(get(index), get(index2), get(index3)); }, arguments); },
            __wbg_buffer_b914fb8b50ebbc3e: (index) => addToStack(get(index).buffer),
            __wbg_newwithbyteoffsetandlength_0de9ee56e9f6ee6e: (index, val, val2) => addToStack(new Uint8Array(get(index), val >>> 0, val2 >>> 0)),
            __wbg_newwithlength_0d03cef43b68a530: (length) => addToStack(new Uint8Array(length >>> 0)),
            __wbg_new_b1f2d6842d615181: (index) => addToStack(new Uint8Array(get(index))),
            __wbg_buffer_67e624f5a0ab2319: (index) => addToStack(get(index).buffer),
            __wbg_length_21c4b0ae73cba59d: (index) => get(index).length,
            __wbg_set_7d988c98e6ced92d: (index, index2, val) => { get(index).set(get(index2), val >>> 0); },
            __wbindgen_debug_string: () => { },
            __wbindgen_throw: (index, offset) => { throw new Error(decodeSub(index, offset)); },
            __wbindgen_memory: () => addToStack(wasm.memory),
            __wbindgen_closure_wrapper117: (Qn, QT) => addToStack(args(Qn, QT, 2, export3)),
            __wbindgen_closure_wrapper119: (Qn, QT) => addToStack(args(Qn, QT, 2, export4)),
            __wbindgen_closure_wrapper121: (Qn, QT) => addToStack(args(Qn, QT, 2, export5)),
            __wbindgen_closure_wrapper123: (Qn, QT) => addToStack(args(Qn, QT, 9, export4)),
        }
    };
}

function assignWasm(resp) {
    wasm = resp.exports;
    (dataView = null), (memoryBuff = null), wasm;
}

async function QN(QP, Qn) {
    let QT, Qt;
    return "function" == typeof Response && QP instanceof Response
        ? ((QT = await QP.arrayBuffer()), (Qt = await WebAssembly.instantiate(QT, Qn)), Object.assign(Qt, { bytes: QT }))
        : (Qt = await WebAssembly.instantiate(QP, Qn)) instanceof WebAssembly.Instance
            ? { instance: Qt, module: QP }
            : Qt;
}

const loadWasm = async (url) => {
    // Force .png for now as per logic
    let mod = initWasm();
    let buffer;
    try {
        const resp = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': user_agent }
        });
        const bytes = new Uint8Array(resp.data);
        ({ instance: url, module: mod, bytes: buffer } = await QN(bytes, mod));
        assignWasm(url);
        return buffer;
    } catch (e) {
        console.error("Failed to load WASM:", e.message);
        throw e;
    }
};

const grootLoader = { groot: () => wasm.groot() };
const wasmLoaderFunctions = Object.assign(loadWasm, {
    initSync: (QP) => {
        let Qn = initWasm();
        QP instanceof WebAssembly.Module || (QP = new WebAssembly.Module(QP));
        assignWasm(new WebAssembly.Instance(QP, Qn));
    }
}, grootLoader);

const runWasm = async (baseUrl, wasmUrlParam) => {
    const wasmUrl = wasmUrlParam || (baseUrl + "/images/loading.png?v=0.0.9");

    // Reset environment
    fake_window.localStorage = {};
    fake_window.location.origin = baseUrl;
    fake_window.location.href = baseUrl; // simplified
    referrer = baseUrl;

    // Fake Image Pre-load (fingerprinting)
    nodeList.image.src = baseUrl + "/images/image.png?v=0.0.9";
    // We need to actually fetch this image to get pixels for canvas fingerprint
    try {
        // NOTE: strict dependency on image-pixels might fail if URL is protected or 404
        // Use fallback data if fetch fails
        const imgData = await pixels(nodeList.image.src);
        image_data.data = new Uint8ClampedArray(imgData.data);
    } catch (e) {
        console.warn("Image fingerprint fetch failed, using blank", e.message);
        // image_data.data remains empty, might affect token validity
    }

    // Get Meta
    try {
        const resp = await axios.get(baseUrl, { headers: { 'User-Agent': user_agent } });
        const txt = resp.data;
        // Extract j_crt Meta
        let regx = /name="j_crt" content="[A-Za-z0-9]*/g;
        let match = txt.match(regx);
        if (match && match[0]) {
            let contentStr = match[0].slice(match[0].lastIndexOf('"') + 1);
            meta.content = contentStr + "==";
        }
    } catch (e) {
        console.warn("Meta fetch failed", e.message);
    }

    // Run Wasm
    try {
        let Q0 = await wasmLoaderFunctions(wasmUrl);
        fake_window.bytes = Q0;
        wasmLoaderFunctions.groot();
        fake_window.jwt_plugin(Q0);
        fake_window.navigate(); // Should generate tokens in localStorage
    } catch (e) {
        console.error("Wasm execution error:", e);
    }

    return fake_window.localStorage;
};

export default runWasm;
