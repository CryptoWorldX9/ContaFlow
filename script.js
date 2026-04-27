import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAVu7GL7IxjgwNGqrIzMp0Xn9ra5c30eEE",
    authDomain: "contaflow-22b0e.firebaseapp.com",
    projectId: "contaflow-22b0e",
    storageBucket: "contaflow-22b0e.firebasestorage.app",
    messagingSenderId: "482658784469",
    appId: "1:482658784469:web:24667c3581affb1ad1fe5c",
    measurementId: "G-CTWWH372DE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "registros");

let myChart = null;
let datosGlobales = [];

const selectorMes = document.getElementById('filtro-periodo');
const hoy = new Date();
selectorMes.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

const netoIn = document.getElementById('neto');
const ivaIn = document.getElementById('iva');
const totalIn = document.getElementById('total');
const tipoSel = document.getElementById('tipo');

function calcular() {
    const neto = parseFloat(netoIn.value) || 0;
    const esFactura = tipoSel.value.includes("Factura");
    ivaIn.value = esFactura ? Math.round(neto * 0.19) : 0;
    totalIn.value = neto + (parseFloat(ivaIn.value) || 0);
}

function calcularInverso() {
    const total = parseFloat(totalIn.value) || 0;
    const esFactura = tipoSel.value.includes("Factura");
    if (esFactura) {
        const neto = Math.round(total / 1.19);
        netoIn.value = neto;
        ivaIn.value = total - neto;
    } else {
        netoIn.value = total;
        ivaIn.value = 0;
    }
}

netoIn.addEventListener('input', calcular);
totalIn.addEventListener('input', calcularInverso);
tipoSel.addEventListener('change', calcular);

function render() {
    const periodoActivo = selectorMes.value;
    const chipsActivos = Array.from(document.querySelectorAll('.chip.active')).map(c => c.dataset.val);
    const filtrados = datosGlobales.filter(d => d.fecha.startsWith(periodoActivo) && chipsActivos.includes(d.tipo));

    const tbody = document.getElementById('lista-datos');
    tbody.innerHTML = '';
    let v = 0, c = 0, ca = 0, iv = 0, ic = 0;

    filtrados.forEach(d => {
        if(d.tipo.includes("Venta") || d.tipo.includes("Boleta")) {
            v += d.total; if(d.tipo.includes("Factura")) iv += d.iva;
        } else if(d.tipo.includes("Compra")) {
            c += d.total; ic += d.iva;
        } else { ca += d.total; }

        tbody.innerHTML += `<tr>
            <td>${d.fecha.split('-').reverse().join('/')}</td>
            <td><span style="color:var(--accent)">${d.tipo}</span></td>
            <td>${d.detalle}</td>
            <td><strong>$${d.total.toLocaleString()}</strong></td>
            <td class="text-right">
                <button onclick="prepararEdicion('${d.id}')">✏️</button>
                <button onclick="eliminarRegistro('${d.id}')">🗑️</button>
            </td>
        </tr>`;
    });

    document.getElementById('stat-ventas').innerText = `$${v.toLocaleString()}`;
    document.getElementById('stat-caja').innerText = `$${ca.toLocaleString()}`;
    document.getElementById('stat-iva').innerText = `$${(iv - ic).toLocaleString()}`;
    actualizarGrafico(v, c, ca);
}

function actualizarGrafico(v, co, ca) {
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ventas', 'Compras', 'Caja'],
            datasets: [{ data: [v, co, ca], backgroundColor: ['#38bdf8', '#a855f7', '#f43f5e'], borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// Ventanas globales para botones
window.eliminarRegistro = async (id) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, "registros", id)); };
window.prepararEdicion = (id) => {
    const d = datosGlobales.find(i => i.id === id);
    document.getElementById('edit-id').value = id;
    document.getElementById('fecha').value = d.fecha;
    document.getElementById('detalle').value = d.detalle;
    netoIn.value = d.neto; ivaIn.value = d.iva; totalIn.value = d.total;
    tipoSel.value = d.tipo; document.getElementById('categoria').value = d.categoria;
    document.getElementById('btn-submit').innerText = "ACTUALIZAR REGISTRO";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const data = {
        fecha: document.getElementById('fecha').value,
        categoria: document.getElementById('categoria').value,
        tipo: document.getElementById('tipo').value,
        detalle: document.getElementById('detalle').value,
        neto: Number(netoIn.value), iva: Number(ivaIn.value), total: Number(totalIn.value)
    };
    if(id) await updateDoc(doc(db, "registros", id), data);
    else await addDoc(colRef, data);
    document.getElementById('registro-form').reset();
    document.getElementById('edit-id').value = "";
});

selectorMes.addEventListener('change', render);
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { c.classList.toggle('active'); render(); }));

onSnapshot(query(colRef, orderBy("fecha", "desc")), (snap) => {
    datosGlobales = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
});
