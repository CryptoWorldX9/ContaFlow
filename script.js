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

// --- LÓGICA DE CÁLCULO BIDIRECCIONAL ---
const netoIn = document.getElementById('neto');
const ivaIn = document.getElementById('iva');
const totalIn = document.getElementById('total');
const tipoSel = document.getElementById('tipo');

function calcularDesdeNeto() {
    const neto = parseFloat(netoIn.value) || 0;
    const esFactura = tipoSel.value.includes("Factura");
    const iva = esFactura ? Math.round(neto * 0.19) : 0;
    ivaIn.value = iva;
    totalIn.value = neto + iva;
}

function calcularDesdeTotal() {
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

netoIn.addEventListener('input', calcularDesdeNeto);
totalIn.addEventListener('input', calcularDesdeTotal);
tipoSel.addEventListener('change', calcularDesdeNeto);

// --- FILTROS MODERNOS ---
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        render();
    });
});

// --- FIREBASE ACCIONES ---
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const data = {
        fecha: document.getElementById('fecha').value,
        categoria: document.getElementById('categoria').value,
        tipo: document.getElementById('tipo').value,
        detalle: document.getElementById('detalle').value,
        neto: Number(netoIn.value),
        iva: Number(ivaIn.value),
        total: Number(totalIn.value),
        created: new Date().getTime()
    };

    if(id) await updateDoc(doc(db, "registros", id), data);
    else await addDoc(colRef, data);

    document.getElementById('registro-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('btn-submit').innerText = "REGISTRAR MOVIMIENTO";
});

// --- RENDERIZADO Y GRÁFICO ---
function render() {
    const filtrosActivos = Array.from(document.querySelectorAll('.filter-btn.active')).map(b => b.dataset.val);
    const filtrados = datosGlobales.filter(d => filtrosActivos.includes(d.tipo));

    const tbody = document.getElementById('lista-datos');
    tbody.innerHTML = '';
    
    let v = 0, c = 0, cc = 0, iv = 0, ic = 0;

    filtrados.forEach(d => {
        if(d.tipo.includes("Venta")) { v += d.total; if(d.tipo.includes("Factura")) iv += d.iva; }
        else if(d.tipo.includes("Compra")) { c += d.total; if(d.tipo.includes("Factura")) ic += d.iva; }
        else { cc += d.total; }

        tbody.innerHTML += `
            <tr>
                <td><span style="color:#8b949e">${d.fecha}</span></td>
                <td><span class="badge">${d.tipo}</span></td>
                <td>${d.detalle}</td>
                <td><strong>$${d.total.toLocaleString('es-CL')}</strong></td>
                <td class="text-right">
                    <button onclick="prepararEdicion('${d.id}')" class="action-btn">✏️</button>
                    <button onclick="eliminarRegistro('${d.id}')" class="action-btn" style="color:#da3633">🗑️</button>
                </td>
            </tr>`;
    });

    document.getElementById('stat-ventas').innerText = `$${v.toLocaleString('es-CL')}`;
    document.getElementById('stat-iva').innerText = `$${(iv - ic).toLocaleString('es-CL')}`;
    actualizarGrafico(v, c, cc);
}

function actualizarGrafico(v, c, cc) {
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ingresos', 'Costos', 'Caja'],
            datasets: [{ 
                data: [v, c, cc], 
                backgroundColor: ['#38bdf8', '#a855f7', '#f59e0b'],
                borderRadius: 12, barThickness: 40
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: '#30363d' }, ticks: { color: '#8b949e' } } }
        }
    });
}

// --- EXPORTAR CORREGIDO ---
window.exportarReporte = (formato) => {
    if (formato === 'excel') {
        const ws = XLSX.utils.json_to_sheet(datosGlobales);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "LibroContable");
        XLSX.writeFile(wb, "ContaFlow_Ultra.xlsx");
    } else {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Reporte Maestro de Movimientos", 14, 20);
        const rows = datosGlobales.map(d => [d.fecha, d.tipo, d.detalle, d.total]);
        doc.autoTable({ head: [['Fecha', 'Tipo', 'Detalle', 'Total']], body: rows, startY: 30 });
        doc.save("ContaFlow_Ultra.pdf");
    }
};

window.eliminarRegistro = async (id) => { if(confirm("¿Eliminar permanentemente?")) await deleteDoc(doc(db, "registros", id)); };
window.prepararEdicion = (id) => {
    const d = datosGlobales.find(i => i.id === id);
    document.getElementById('edit-id').value = id;
    document.getElementById('fecha').value = d.fecha;
    document.getElementById('detalle').value = d.detalle;
    netoIn.value = d.neto;
    ivaIn.value = d.iva;
    totalIn.value = d.total;
    tipoSel.value = d.tipo;
    document.getElementById('categoria').value = d.categoria;
    document.getElementById('btn-submit').innerText = "ACTUALIZAR REGISTRO";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

onSnapshot(query(colRef, orderBy("fecha", "desc")), (snap) => {
    datosGlobales = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
});
