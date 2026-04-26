import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

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

// Lógica de Impuestos automática
const netoIn = document.getElementById('neto');
const tipoSel = document.getElementById('tipo');

function actualizarCalculos() {
    const neto = parseFloat(netoIn.value) || 0;
    const tipo = tipoSel.value;
    const iva = tipo.includes("Factura") ? Math.round(neto * 0.19) : 0;
    document.getElementById('iva').value = iva;
    document.getElementById('total').value = neto + iva;
}

netoIn.addEventListener('input', actualizarCalculos);
tipoSel.addEventListener('change', actualizarCalculos);

// Gráfico
let myChart;
function actualizarGrafico(datos) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const ventas = datos.filter(d => d.tipo.includes("Venta")).reduce((a, b) => a + b.total, 0);
    const compras = datos.filter(d => d.tipo.includes("Compra")).reduce((a, b) => a + b.total, 0);
    const cajaChica = datos.filter(d => d.categoria === "cajachica").reduce((a, b) => a + b.total, 0);

    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ventas', 'Compras', 'Caja Chica'],
            datasets: [{
                label: 'Monto en $',
                data: [ventas, compras, cajaChica],
                backgroundColor: ['#38bdf8', '#22c55e', '#ef4444']
            }]
        },
        options: { plugins: { legend: { display: false } } }
    });

    document.getElementById('stat-ventas').innerText = `$${ventas.toLocaleString('es-CL')}`;
    const ivaVentas = datos.filter(d => d.tipo === "Factura Venta").reduce((a, b) => a + b.iva, 0);
    const ivaCompras = datos.filter(d => d.tipo === "Factura Compra").reduce((a, b) => a + b.iva, 0);
    document.getElementById('stat-iva').innerText = `$${(ivaVentas - ivaCompras).toLocaleString('es-CL')}`;
}

// Guardar
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(colRef, {
        fecha: document.getElementById('fecha').value,
        categoria: document.getElementById('categoria').value,
        tipo: document.getElementById('tipo').value,
        detalle: document.getElementById('detalle').value,
        neto: Number(document.getElementById('neto').value),
        iva: Number(document.getElementById('iva').value),
        total: Number(document.getElementById('total').value),
        timestamp: new Date()
    });
    document.getElementById('registro-form').reset();
});

// Escuchar cambios
onSnapshot(query(colRef, orderBy("fecha", "desc")), (snapshot) => {
    const list = [];
    const tbody = document.getElementById('lista-datos');
    tbody.innerHTML = '';
    snapshot.forEach(doc => {
        const d = doc.data();
        list.push(d);
        tbody.innerHTML += `
            <tr style="border-left: 4px solid ${d.categoria === 'negocio' ? '#38bdf8' : '#ef4444'}">
                <td>${d.fecha}</td>
                <td style="font-size: 0.8rem; color: #94a3b8">${d.categoria.toUpperCase()}</td>
                <td>${d.tipo}</td>
                <td>${d.detalle}</td>
                <td>$${d.neto.toLocaleString('es-CL')}</td>
                <td>$${d.iva.toLocaleString('es-CL')}</td>
                <td>$${d.total.toLocaleString('es-CL')}</td>
            </tr>`;
    });
    actualizarGrafico(list);
});

window.generarPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("ContaFlow Pro - Reporte de Movimientos", 14, 15);
    doc.autoTable({ html: '#tabla-registros', startY: 25 });
    doc.save("Reporte_Contable_Pro.pdf");
}
