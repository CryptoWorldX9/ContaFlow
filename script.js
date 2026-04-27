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

// --- INICIALIZAR MES ---
const selectorMes = document.getElementById('filtro-periodo');
const hoy = new Date();
selectorMes.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

// --- CAMPOS ---
const netoIn = document.getElementById('neto');
const ivaIn = document.getElementById('iva');
const totalIn = document.getElementById('total');
const tipoDoc = document.getElementById('tipo');

// --- LÓGICA DE CÁLCULOS (IGUAL A TU VERSIÓN PRO) ---
function calcular() {
    const neto = parseFloat(netoIn.value) || 0;
    const esFactura = tipoDoc.value.includes("Factura");
    const iva = esFactura ? Math.round(neto * 0.19) : 0;
    ivaIn.value = iva;
    totalIn.value = neto + iva;
}

function calcularInverso() {
    const total = parseFloat(totalIn.value) || 0;
    const esFactura = tipoDoc.value.includes("Factura");
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
tipoDoc.addEventListener('change', calcular);

// --- RENDERIZADO Y FILTROS ---
function render() {
    const periodoActivo = selectorMes.value;
    const chipsActivos = Array.from(document.querySelectorAll('.chip.active')).map(c => c.dataset.val);
    
    // Filtrar por mes y por los botones de arriba
    const filtrados = datosGlobales.filter(d => {
        const coincideMes = d.fecha.startsWith(periodoActivo);
        const coincideTipo = chipsActivos.some(chip => d.tipo.includes(chip));
        return coincideMes && coincideTipo;
    });

    const tbody = document.getElementById('lista-datos');
    tbody.innerHTML = '';
    
    let ventas = 0, gastos = 0, ivaMes = 0;

    filtrados.forEach(d => {
        const esVenta = d.tipo.includes("Venta") || d.tipo.includes("Boleta");
        if(esVenta) {
            ventas += d.total;
            if(d.tipo.includes("Factura")) ivaMes += d.iva;
        } else {
            gastos += d.total;
            if(d.tipo.includes("Factura")) ivaMes -= d.iva;
        }

        tbody.innerHTML += `
            <tr>
                <td>${d.fecha.split('-').reverse().join('/')}</td>
                <td><span style="color:var(--accent)">${d.itemTipo || 'General'}</span><br><small>${d.tipo}</small></td>
                <td><strong>${d.proveedor || 'S/I'}</strong><br>${d.detalle.replace(/\n/g, '<br>')}</td>
                <td>$${d.total.toLocaleString('es-CL')}</td>
                <td class="text-right">
                    <button onclick="prepararEdicion('${d.id}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem">✏️</button>
                    <button onclick="eliminarRegistro('${d.id}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem">🗑️</button>
                </td>
            </tr>`;
    });

    document.getElementById('stat-ventas').innerText = `$${ventas.toLocaleString('es-CL')}`;
    document.getElementById('stat-gastos').innerText = `$${gastos.toLocaleString('es-CL')}`;
    document.getElementById('stat-iva').innerText = `$${ivaMes.toLocaleString('es-CL')}`;

    actualizarGrafico(ventas, gastos);
}

// --- GRÁFICO (CHART.JS) ---
function actualizarGrafico(v, g) {
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ventas', 'Gastos'],
            datasets: [{
                data: [v, g],
                backgroundColor: ['#38bdf8', '#f43f5e'],
                borderRadius: 8
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// --- ACCIONES FIREBASE ---
window.eliminarRegistro = async (id) => { if(confirm("¿Seguro de eliminar este registro?")) await deleteDoc(doc(db, "registros", id)); };

window.prepararEdicion = (id) => {
    const d = datosGlobales.find(i => i.id === id);
    document.getElementById('edit-id').value = id;
    document.getElementById('fecha').value = d.fecha;
    document.getElementById('item-tipo').value = d.itemTipo || 'Mercadería';
    document.getElementById('tipo').value = d.tipo;
    document.getElementById('proveedor').value = d.proveedor || '';
    document.getElementById('detalle').value = d.detalle;
    netoIn.value = d.neto; 
    ivaIn.value = d.iva; 
    totalIn.value = d.total;
    document.getElementById('btn-submit').innerText = "ACTUALIZAR REGISTRO";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const data = {
        fecha: document.getElementById('fecha').value,
        itemTipo: document.getElementById('item-tipo').value,
        tipo: document.getElementById('tipo').value,
        proveedor: document.getElementById('proveedor').value,
        detalle: document.getElementById('detalle').value,
        neto: Number(netoIn.value),
        iva: Number(ivaIn.value),
        total: Number(totalIn.value)
    };

    if(id) await updateDoc(doc(db, "registros", id), data);
    else await addDoc(colRef, data);

    e.target.reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('btn-submit').innerText = "GUARDAR REGISTRO";
});

// --- EVENTOS DE INTERFAZ ---
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { 
    c.classList.toggle('active'); 
    render(); 
}));

selectorMes.addEventListener('change', render);

onSnapshot(query(colRef, orderBy("fecha", "desc")), (snap) => {
    datosGlobales = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
});
