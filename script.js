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

// --- CÁLCULOS AUTOMÁTICOS ---
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

// --- GUARDAR O EDITAR ---
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
        total: Number(document.getElementById('total').value),
        timestamp: new Date()
    };

    try {
        if (id) {
            await updateDoc(doc(db, "registros", id), data);
            document.getElementById('edit-id').value = "";
            document.getElementById('btn-submit').innerText = "GUARDAR REGISTRO";
        } else {
            await addDoc(colRef, data);
        }
        document.getElementById('registro-form').reset();
    } catch (err) { alert("Error de conexión"); }
});

// --- RENDERIZAR TABLA Y FILTROS ---
function actualizarApp() {
    const checks = Array.from(document.querySelectorAll('.f-check:checked')).map(c => c.value);
    const filtrados = datosGlobales.filter(d => checks.includes(d.tipo));

    const tbody = document.getElementById('lista-datos');
    tbody.innerHTML = '';
    
    let ventas = 0, gastos = 0, ivaV = 0, ivaC = 0;

    filtrados.forEach(d => {
        if(d.tipo.includes("Venta")) { 
            ventas += d.total; 
            if(d.tipo.includes("Factura")) ivaV += d.iva;
        } else { 
            gastos += d.total; 
            if(d.tipo.includes("Factura Compra")) ivaC += d.iva;
        }

        tbody.innerHTML += `
            <tr>
                <td>${d.fecha.split('-').reverse().join('/')}</td>
                <td>${d.tipo.replace('Factura ', 'F. ').replace('Gasto ', 'G. ')}</td>
                <td>${d.detalle}</td>
                <td>$${d.total.toLocaleString('es-CL')}</td>
                <td>
                    <button onclick="prepararEdicion('${d.id}')" class="btn-edit">✏️</button>
                    <button onclick="eliminarRegistro('${d.id}')" class="btn-del">🗑️</button>
                </td>
            </tr>`;
    });

    document.getElementById('stat-ventas').innerText = `$${ventas.toLocaleString('es-CL')}`;
    document.getElementById('stat-gastos').innerText = `$${gastos.toLocaleString('es-CL')}`;
    document.getElementById('stat-iva').innerText = `$${(ivaV - ivaC).toLocaleString('es-CL')}`;

    actualizarGrafico(ventas, gastos);
}

// --- GRÁFICO ---
function actualizarGrafico(v, g) {
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ventas', 'Gastos'],
            datasets: [{ data: [v, g], backgroundColor: ['#38bdf8', '#ef4444'], borderWidth: 0 }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: {color: '#fff'} } } }
    });
}

// --- EXPORTAR ---
window.exportarReporte = function(formato) {
    const checks = Array.from(document.querySelectorAll('.f-check:checked')).map(c => c.value);
    const filtrados = datosGlobales.filter(d => checks.includes(d.tipo));

    if(formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("ContaFlow Pro - Reporte Contable", 14, 15);
        const rows = filtrados.map(d => [d.fecha, d.tipo, d.detalle, d.neto, d.iva, d.total]);
        doc.autoTable({ head: [['Fecha', 'Tipo', 'Detalle', 'Neto', 'IVA', 'Total']], body: rows, startY: 25 });
        doc.save("Reporte_ContaFlow.pdf");
    } else {
        const ws = XLSX.utils.json_to_sheet(filtrados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contabilidad");
        XLSX.writeFile(wb, "Reporte_ContaFlow.xlsx");
    }
};

// --- ELIMINAR/EDITAR ---
window.eliminarRegistro = async (id) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, "registros", id)); };
window.prepararEdicion = (id) => {
    const d = datosGlobales.find(item => item.id === id);
    document.getElementById('edit-id').value = id;
    document.getElementById('fecha').value = d.fecha;
    document.getElementById('detalle').value = d.detalle;
    document.getElementById('neto').value = d.neto;
    document.getElementById('tipo').value = d.tipo;
    calcular();
    document.getElementById('btn-submit').innerText = "ACTUALIZAR DATOS";
    window.scrollTo(0,0);
};

// Escucha de Filtros
document.querySelectorAll('.f-check').forEach(c => c.addEventListener('change', actualizarApp));

// Escucha Firebase
onSnapshot(query(colRef, orderBy("fecha", "desc")), (snapshot) => {
    datosGlobales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    actualizarApp();
});
