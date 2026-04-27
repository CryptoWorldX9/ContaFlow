import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

const app = initializeApp({
apiKey: "AIzaSy...",
authDomain: "contaflow-22b0e.firebaseapp.com",
projectId: "contaflow-22b0e"
});

const db = getFirestore(app);
const col = collection(db, "registros");

let data = [];
let IVA = localStorage.getItem("iva") || 19;

document.getElementById("configIva").value = IVA;

// fecha hoy
fecha.value = new Date().toISOString().slice(0,10);

// ITEMS
function addItem() {
const row = document.createElement("tr");

row.innerHTML = `
<td><input class="cant" value="1"></td>
<td><input class="desc"></td>
<td><input class="precio"></td>
<td class="sub">0</td>
<td><button onclick="this.closest('tr').remove();calc()">x</button></td>
`;

itemsBody.appendChild(row);
attachCalc();
}
window.addItem = addItem;

function attachCalc(){
document.querySelectorAll(".cant,.precio").forEach(i=>{
i.oninput = calc;
});
}

function calc(){
let neto=0;

document.querySelectorAll("#itemsBody tr").forEach(r=>{
const c = Number(r.querySelector(".cant").value);
const p = Number(r.querySelector(".precio").value);
const s = c*p;
r.querySelector(".sub").innerText = s;
neto += s;
});

netoInput.value = neto;
const iva = Math.round(neto * (IVA/100));
ivaCalc.value = iva;
total.value = neto + iva;
}

const netoInput = document.getElementById("neto");
const ivaCalc = document.getElementById("ivaCalc");
const total = document.getElementById("total");

// SAVE
form.onsubmit = async e=>{
e.preventDefault();

const items = [];

document.querySelectorAll("#itemsBody tr").forEach(r=>{
items.push({
cant:r.querySelector(".cant").value,
desc:r.querySelector(".desc").value,
precio:r.querySelector(".precio").value
});
});

await addDoc(col,{
fecha:fecha.value,
tipo:tipoDoc.value,
tipoItem:tipoItem.value,
rut:rut.value,
proveedor:proveedor.value,
items,
neto:Number(neto.value),
iva:Number(ivaCalc.value),
total:Number(total.value)
});

form.reset();
itemsBody.innerHTML="";
addItem();
};

// LIST
onSnapshot(col, snap=>{
data = snap.docs.map(d=>({id:d.id,...d.data()}));
render();
});

function render(){
tabla.innerHTML="";

let v=0,c=0,i=0;

data.forEach(d=>{
if(d.tipo.includes("Venta")) v+=d.total;
else c+=d.total;
i+=d.iva;

tabla.innerHTML+=`
<tr>
<td>${d.fecha}</td>
<td>${d.tipo}</td>
<td>${d.proveedor||"-"}</td>
<td>$${d.total}</td>
<td><button onclick="del('${d.id}')">🗑</button></td>
</tr>
`;
});

ventas.innerText="$"+v;
compras.innerText="$"+c;
iva.innerText="$"+i;
}

window.del = async id=>{
await deleteDoc(doc(db,"registros",id));
};

// CONFIG
window.toggleConfig=()=>{
config.classList.toggle("show");
};

window.saveConfig=()=>{
IVA = configIva.value;
localStorage.setItem("iva", IVA);
};

// INIT
addItem();

