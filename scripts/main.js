let myImage = document.querySelector('img');

myImage.onclick = function() {
    let mySrc = myImage.getAttribute('src');
    if(mySrc === 'img/1.jpeg') {
      myImage.setAttribute ('src','img/2.jpeg');
    } else {
      myImage.setAttribute ('src','img/1.jpeg');
    }
}

let myButton = document.querySelector('button');
let myHeading = document.querySelector('h1');

function setUserName() {
    let myName = prompt('Bitte gebe deinen Namen ein.');
    if(!myName || myName === null) {
        setUserName();
    } else {
    localStorage.setItem('name', myName);
    myHeading.textContent = 'Hallo ' + myName;
    }
}

if(!localStorage.getItem('name')) {
    setUserName();
} else {
    let storedName = localStorage.getItem('name');
    myHeading.textContent = 'Hallo ' + storedName;
}

myButton.onclick = function() {
    setUserName();
}