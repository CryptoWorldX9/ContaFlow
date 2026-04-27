import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAVu7GL7IxjgwNGqrIzMp0Xn9ra5c30eEE",
    authDomain: "contaflow-22b0e.firebaseapp.com",
    projectId: "contaflow-22b0e",
    storageBucket: "contaflow-22b0e.firebasestorage.app",
    messagingSenderId: "482658784469",
    appId: "1:482658784469:web:24667c3581affb1ad1fe5c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "registros");

// --- GESTIÓN DE CONFIGURACIÓN (LOCALSTORAGE) ---
let opcionesClasificacion = JSON.parse(localStorage.getItem('tags')) || ["Mercadería", "Servicio", "Venta", "Insumos"];
let tasaIva = localStorage.getItem('ivaVal') || 19;

function actualizarUIConfig() {
    const select = document.getElementById('item-tipo');
    const lista = document.getElementById('tag-list');
    select.innerHTML = ''; lista.innerHTML = '';
    
    opcionesClasificacion.forEach((tag, index) => {
        select.innerHTML += `<option value="${tag}">${tag}</option>`;
        lista.innerHTML += `<li>${tag} <button onclick="window.removeTag(${index})">✕</button></li>`;
    });
    localStorage.setItem('tags', JSON.stringify(opcionesClasificacion));
}

window.removeTag = (idx) => { opcionesClasificacion.splice(idx, 1); actualizarUIConfig(); };
document.getElementById('add-tag-btn').onclick = () => {
    const val = document.getElementById('new-tag-name').value;
    if(val) { opcionesClasificacion.push(val); document.getElementById('new-tag-name').value=''; actualizarUIConfig(); }
};

// --- MODAL ---
document.getElementById('open-config').onclick = () => document.getElementById('modal-config').style.display='flex';
document.getElementById('close-config').onclick = () => {
    tasaIva = document.getElementById('config-iva-val').value;
    localStorage.setItem('ivaVal', tasaIva);
    document.getElementById('modal-config').style.display='none';
};

// --- CÁLCULOS ---
const netoIn = document.getElementById('neto');
const ivaIn = document.getElementById('iva');
const totalIn = document.getElementById('total');
const tipoDoc = document.getElementById('tipo');

function calcular() {
    const neto = parseFloat(netoIn.value) || 0;
    const esFactura = tipoDoc.value.includes("Factura");
    const iva = esFactura ? Math.round(neto * (tasaIva / 100)) : 0;
    ivaIn.value = iva; totalIn.value = neto + iva;
}

netoIn.oninput = calcular;
tipoDoc.onchange = calcular;

// --- FIREBASE ---
document.getElementById('registro-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const data = {
        fecha: document.getElementById('fecha').value,
        itemTipo: document.getElementById('item-tipo').value,
        tipo: document.getElementById('tipo').value,
        proveedor: document.getElementById('proveedor').value,
        detalle: document.getElementById('detalle').value,
        neto: Number(netoIn.value), iva: Number(ivaIn.value), total: Number(totalIn.value)
    };
    if(id) await updateDoc(doc(db, "registros", id), data);
    else await addDoc(colRef, data);
    e.target.reset(); document.getElementById('edit-id').value = "";
};

onSnapshot(query(colRef, orderBy("fecha", "desc")), (snap) => {
    const tbody = document.getElementById('lista-datos');
    tbody.innerHTML = '';
    let v=0, g=0, i=0;
    snap.forEach(s => {
        const d = s.data();
        const esV = d.tipo.includes("Venta");
        if(esV) v += d.total; else g += d.total;
        i += esV ? d.iva : -d.iva;
        tbody.innerHTML += `<tr><td>${d.fecha}</td><td>${d.itemTipo}</td><td>${d.proveedor}<br><small>${d.detalle}</small></td><td>$${d.total.toLocaleString()}</td><td><button onclick="window.del('${s.id}')">🗑️</button></td></tr>`;
    });
    document.getElementById('stat-ventas').innerText = `$${v.toLocaleString()}`;
    document.getElementById('stat-gastos').innerText = `$${g.toLocaleString()}`;
    document.getElementById('stat-iva').innerText = `$${i.toLocaleString()}`;
});

window.del = (id) => confirm("¿Borrar?") && deleteDoc(doc(db, "registros", id));
actualizarUIConfig();
