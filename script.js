import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

const app = initializeApp({
apiKey: "AIzaSy...",
authDomain: "contaflow-22b0e.firebaseapp.com",
projectId: "contaflow-22b0e"
});

const db = getFirestore(app);
const col = collection(db, "registros");

let datos = [];
let tiposConfig = JSON.parse(localStorage.getItem("tipos")) || [];

const lista = document.getElementById("lista");

// FECHA HOY
document.getElementById("fecha").value = new Date().toISOString().slice(0,10);

// CALCULO
const neto = document.getElementById("neto");
const iva = document.getElementById("iva");
const total = document.getElementById("total");

neto.oninput = () => {
iva.value = Math.round(neto.value * 0.19);
total.value = Number(neto.value) + Number(iva.value);
};

total.oninput = () => {
neto.value = Math.round(total.value / 1.19);
iva.value = total.value - neto.value;
};

// DETALLE LISTA
function agregarItem(texto="") {
const div = document.createElement("div");
div.className="item";

div.innerHTML = `
<input placeholder="Producto / servicio" value="${texto}">
<button onclick="this.parentElement.remove()">x</button>
`;

document.getElementById("detalle-lista").appendChild(div);
}
window.agregarItem = agregarItem;

// GUARDAR
document.getElementById("form").onsubmit = async e => {
e.preventDefault();

const items = [...document.querySelectorAll(".item input")].map(i=>i.value);

const data = {
fecha: fecha.value,
tipo: tipo.value,
subtipo: subtipo.value,
rut: rut.value,
proveedor: proveedor.value,
items,
neto: Number(neto.value),
iva: Number(iva.value),
total: Number(total.value)
};

await addDoc(col, data);
e.target.reset();
document.getElementById("detalle-lista").innerHTML="";
agregarItem();
};

// LISTAR
onSnapshot(col, snap=>{
datos = snap.docs.map(d=>({id:d.id,...d.data()}));
render();
});

function render(){
lista.innerHTML="";

let ventas=0, caja=0, ivaTotal=0;

datos.forEach(d=>{

if(d.tipo.includes("Venta")) ventas+=d.total;
else caja+=d.total;

ivaTotal += d.iva;

lista.innerHTML += `
<tr>
<td>${d.fecha}</td>
<td>${d.tipo}</td>
<td>${d.proveedor || "-"}</td>
<td>$${d.total}</td>
<td>
<button onclick="eliminar('${d.id}')">🗑</button>
</td>
</tr>
`;
});

stat_ventas.innerText="$"+ventas;
stat_caja.innerText="$"+caja;
stat_iva.innerText="$"+ivaTotal;
}

window.eliminar = async id=>{
await deleteDoc(doc(db,"registros",id));
};

// CONFIG
window.abrirConfig = ()=> configModal.style.display="flex";
window.cerrarConfig = ()=> configModal.style.display="none";

window.agregarTipo = ()=>{
const val = nuevoTipo.value;
tiposConfig.push(val);
localStorage.setItem("tipos", JSON.stringify(tiposConfig));
renderTipos();
};

function renderTipos(){
listaTipos.innerHTML="";
tiposConfig.forEach(t=>{
listaTipos.innerHTML+=`<li>${t}</li>`;
});
}

renderTipos();
agregarItem();
