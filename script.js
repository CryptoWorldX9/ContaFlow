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

// --- FUNCIONALIDAD CHIPS ---
document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        render();
    });
});

// --- CALCULOS AUTOMATICOS ---
const netoIn = document.getElementById('neto');
const tipoSel = document.getElementById('tipo');

function calcular() {
    const neto = parseFloat(netoIn.value) || 0;
    const iva = tipoSel.value.includes("Factura") ? Math.round(neto * 0.19) : 0;
    document.getElementById('iva').value = iva;
    document.getElementById('total').value = neto + iva;
}
netoIn.addEventListener('input', calcular);
tipoSel.addEventListener('change', calcular);

// --- GUARDAR / EDITAR ---
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const data = {
        fecha: document.getElementById('fecha').value,
        categoria: document.getElementById('categoria').value,
        tipo: document.getElementById('tipo').value,
        detalle: document.getElementById('detalle').value,
        neto: Number(document.getElementById('neto').value),
        iva: Number(document.getElementById('iva').value),
        total: Number(document.getElementById('total').value)
    };

    if(id) await updateDoc(doc(db, "registros", id), data);
    else await addDoc(colRef, data);

    document.getElementById('registro-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('btn-submit').innerText = "GUARDAR DATOS";
});

// --- RENDERIZADO ---
function render() {
    const chipsActivos = Array.from(document.querySelectorAll('.chip.active')).map(c => c.dataset.val);
    const filtrados = datosGlobales.filter(d => chipsActivos.includes(d.tipo));

    const tbody = document.getElementById('lista-datos');
    tbody.innerHTML = '';
    
    let v = 0, c = 0, cc = 0, iv = 0, ic = 0;

    filtrados.forEach(d => {
        if(d.tipo.includes("Venta")) { v += d.total; if(d.tipo.includes("Factura")) iv += d.iva; }
        else if(d.tipo.includes("Compra")) { c += d.total; if(d.tipo.includes("Factura")) ic += d.iva; }
        else { cc += d.total; }

        tbody.innerHTML += `
            <tr>
                <td>${d.fecha.slice(5)}</td>
                <td>${d.tipo.split(' ')[0]}</td>
                <td>$${d.total.toLocaleString()}</td>
                <td>
                    <div class="action-btns">
                        <button onclick="prepararEdicion('${d.id}')">✏️</button>
                        <button onclick="eliminarRegistro('${d.id}')">🗑️</button>
                    </div>
                </td>
            </tr>`;
    });

    document.getElementById('stat-ventas').innerText = `$${v.toLocaleString()}`;
    document.getElementById('stat-iva').innerText = `$${(iv - ic).toLocaleString()}`;
    actualizarGrafico(v, c, cc);
}

function actualizarGrafico(v, c, cc) {
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ventas', 'Compras', 'Caja'],
            datasets: [{ data: [v, c, cc], backgroundColor: ['#38bdf8', '#22c55e', '#ef4444'], borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// --- ACCIONES ---
window.eliminarRegistro = async (id) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, "registros", id)); };
window.prepararEdicion = (id) => {
    const d = datosGlobales.find(i => i.id === id);
    document.getElementById('edit-id').value = id;
    document.getElementById('fecha').value = d.fecha;
    document.getElementById('detalle').value = d.detalle;
    document.getElementById('neto').value = d.neto;
    document.getElementById('tipo').value = d.tipo;
    document.getElementById('categoria').value = d.categoria;
    document.getElementById('btn-submit').innerText = "ACTUALIZAR";
    window.scrollTo(0,0);
};

// --- EXPORTAR ---
window.exportarReporte = (tipo) => {
    const ws = XLSX.utils.json_to_sheet(datosGlobales);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contabilidad");
    XLSX.writeFile(wb, "ContaFlow_Report.xlsx");
};

onSnapshot(query(colRef, orderBy("fecha", "desc")), (snap) => {
    datosGlobales = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
});
