import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

// Configuración de tu proyecto (Ya conectada)
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
const coleccionRef = collection(db, "registros");

// Lógica de cálculos automáticos
const netoInput = document.getElementById('neto');
const tipoSelect = document.getElementById('tipo');

function calcularMontos() {
    const neto = parseFloat(netoInput.value) || 0;
    const tipo = tipoSelect.value;
    
    // Si es Factura, calculamos IVA. Si es Boleta o Gasto, el IVA suele ser 0 o estar incluido.
    // Para el SII, en facturas siempre se separa el 19%.
    if (tipo.includes("Factura")) {
        const iva = Math.round(neto * 0.19);
        document.getElementById('iva').value = iva;
        document.getElementById('total').value = neto + iva;
    } else {
        document.getElementById('iva').value = 0;
        document.getElementById('total').value = neto;
    }
}

netoInput.addEventListener('input', calcularMontos);
tipoSelect.addEventListener('change', calcularMontos);

// Guardar datos en la base de datos
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const nuevoRegistro = {
            fecha: document.getElementById('fecha').value,
            tipo: document.getElementById('tipo').value,
            detalle: document.getElementById('detalle').value,
            neto: Number(document.getElementById('neto').value),
            iva: Number(document.getElementById('iva').value),
            total: Number(document.getElementById('total').value),
            timestamp: new Date()
        };

        await addDoc(coleccionRef, nuevoRegistro);
        alert("¡Registro guardado con éxito!");
        document.getElementById('registro-form').reset();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Hubo un error al conectar con Google. Revisa las Reglas de Firestore.");
    }
});

// Mostrar datos en la tabla automáticamente
onSnapshot(query(coleccionRef, orderBy("fecha", "desc")), (snapshot) => {
    const tabla = document.getElementById('lista-datos');
    tabla.innerHTML = '';
    snapshot.forEach(doc => {
        const data = doc.data();
        tabla.innerHTML += `
            <tr>
                <td>${data.fecha}</td>
                <td><strong>${data.tipo}</strong></td>
                <td>${data.detalle}</td>
                <td>$${data.neto.toLocaleString('es-CL')}</td>
                <td>$${data.iva.toLocaleString('es-CL')}</td>
                <td>$${data.total.toLocaleString('es-CL')}</td>
            </tr>
        `;
    });
});

// Generar Reporte PDF Profesional
window.generarPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("ContaFlow - Reporte Contable Mensual", 14, 20);
    doc.setFontSize(10);
    doc.text("Documento generado para apoyo en Declaración F29", 14, 28);
    
    doc.autoTable({ 
        html: '#tabla-registros', 
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [26, 42, 108] }
    });
    
    doc.save("Reporte_Mensual_ContaFlow.pdf");
}
