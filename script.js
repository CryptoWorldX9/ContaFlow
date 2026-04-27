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
        total: Number(document.getElementById('total').value)
    };

    try {
        if (id) {
            await updateDoc(doc(db, "registros", id), data);
            document.getElementById('edit-id').value = "";
            document.getElementById('btn-submit').innerText = "Guardar Registro";
        } else {
            await addDoc(colRef, data);
        }
        document.getElementById('registro-form').reset();
    } catch (err) {
        alert("Error de conexión: Revisa las Reglas en Firebase Console");
    }
});

// --- ELIMINAR ---
window.eliminarRegistro = async (id) => {
    if(confirm("¿Seguro que quieres borrar este registro?")) {
        await deleteDoc(doc(db, "registros", id));
    }
};

// --- CARGAR PARA EDITAR ---
window.prepararEdicion = (id) => {
    const d = datosGlobales.find(item => item.id === id);
    document.getElementById('edit-id').value = id;
    document.getElementById('fecha').value = d.fecha;
    document.getElementById('categoria').value = d.categoria;
    document.getElementById('tipo').value = d.tipo;
    document.getElementById('detalle').value = d.detalle;
    document.getElementById('neto').value = d.neto;
    calcular();
    document.getElementById('btn-submit').innerText = "Actualizar Registro";
    window.scrollTo(0,0);
};

// --- FILTROS ---
document.getElementById('filtro-mes').addEventListener('change', (e) => renderizar(datosGlobales));
window.resetFiltro = () => { document.getElementById('filtro-mes').value = ""; renderizar(datosGlobales); };

// --- RENDERIZADO Y GRÁFICO ---
function renderizar(datos) {
    const filtro = document.getElementById('filtro-mes').value;
    const filtrados = filtro ? datos.filter(d => d.fecha.startsWith(filtro)) : datos;
    
    const tbody = document.getElementById('lista-datos');
    tbody.innerHTML = '';
    
    let v = 0, c = 0, cc = 0, iv = 0, ic = 0;

    filtrados.forEach(d => {
        if(d.tipo.includes("Venta")) { v += d.total; if(d.tipo.includes("Factura")) iv += d.iva; }
        else if(d.tipo.includes("Compra")) { c += d.total; if(d.tipo.includes("Factura")) ic += d.iva; }
        else { cc += d.total; }

        tbody.innerHTML += `
            <tr>
                <td>${d.fecha}</td>
                <td>${d.tipo}</td>
                <td>${d.detalle}</td>
                <td>$${d.neto.toLocaleString()}</td>
                <td>$${d.iva.toLocaleString()}</td>
                <td>$${d.total.toLocaleString()}</td>
                <td>
                    <button onclick="prepararEdicion('${d.id}')" class="btn-edit">✏️</button>
                    <button onclick="eliminarRegistro('${d.id}')" class="btn-del">🗑️</button>
                </td>
            </tr>`;
    });

    document.getElementById('stat-ventas').innerText = `$${v.toLocaleString()}`;
    document.getElementById('stat-iva').innerText = `$${(iv - ic).toLocaleString()}`;

    // Fix Gráfico loco
    if (myChart) myChart.destroy();
    const ctx = document.getElementById('myChart');
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ventas', 'Compras', 'Caja Chica'],
            datasets: [{ data: [v, c, cc], backgroundColor: ['#38bdf8', '#22c55e', '#ef4444'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: {display: false} } }
    });
}

// ESCUCHA EN TIEMPO REAL
onSnapshot(query(colRef, orderBy("fecha", "desc")), (snapshot) => {
    datosGlobales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizar(datosGlobales);
});
