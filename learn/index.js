console.log("hi dom is loading")
let un
// Run this code only after the DOM (HTML content) is fully loaded
document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("mySub").onclick = function(){
        un = document.getElementById("myText").value
        console.log(un)
        document.getElementById("myH1").textContent =  `Hello ${un}`
    }})