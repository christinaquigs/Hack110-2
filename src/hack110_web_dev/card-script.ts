// common errors: check your HTML page to ensure that the names of your files are correct
// there must be a line underneath the names of your links

// any clicking or interaction sshould be done here
import "introcs";
// let myImage: HTMLImageElement = document.getElementById("pic") as HTMLImageElement;

// myImage.onclick = function (event: MouseEvent): void {
//     myImage.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Mitch_McConnell_close-up.JPG/220px-Mitch_McConnell_close-up.JPG";
// }; // anonymous functions need a semi-colon at the end
// see the Events slides to learn the HTML elements, etc. 
// you will need write the function in the TS file and link that to the HTML file 

// go to w3schools.com -- go there first if you're trying to make a website
// you can learn HTML there!

// right click and inspect your website: if there's an error, click the red dot in the corner of the screen


// 1. Greeting - "Good evening, Christina" - Enter name first, spell it wrong


// export function forkMain(answer: string): void {
//     let nameToScramble: string = "";
//     if ()
// }


// need the choose your own adventure lead to another page setting

export function main1(): void {
    let name: string | null;
    name = prompt("Enter name", "name");
    if (name !== null ) {
        print(nameScramble(name));
    } else {
        prompt("Enter name", "name");
    }
}
export function nameScramble(name: string): string {
    let changedName: string = "";
    for (let i: number = 0; i < name.length; i++) {
        if ((name[i] === "a") || (name[i] === "e") || (name[i] === "i") || (name[i] === "o") || (name[i] === "u")) {
            changedName = changedName;
        } else {
            changedName = changedName + name[i];
        }
    }
    return "Good Day, " + changedName;
}
export function newName(name: string): void {
    print(nameScramble(name));
}
main1();


// 2. Prompt String Function - What is Your Main Focus
export function main(): void {
    promptString("What is your main focus for today?", respond);
}
export function respond(focus: string): void {
    print(getAnswer());
}
export function getAnswer(): string {
    let answer: number = random(1, 3);
    if (answer === 1) {
        return "Hmmm, are you sure about that?";
    }
    if (answer === 2) {
        return "You might need to rethink your priorities.";
    } else {
        return "THAT is your 'main focus'?";
    }
}
main();

// 3. Quotations at the bottom of the page - Uninspiring Politicans
export function getQuote(): string {
    let answer: number = random(1, 6);
    if (answer === 1) {
        return "A zebra does not change its spots. --Al Gore";
    } else if (answer === 2) {
        return "There's an old saying in Tennessee--I know it's in Texas, probably in Tennessee--that says, fool me once, shame on--shame on you. Fool me--you can't get fooled again. --George W. Bush";
    } else if (answer === 3) {
        return "Reports that say something hasn't happened are always interesting to me, because as we know, there are known knowns; there are things we know we know. We also know there are known unknowns--the ones we don't know we don't know. --Donald Rumsfeld, former US Defense Secretary";
    } else if (answer === 4) {
        return "Life is indeed precious, and I believe the death penalty helps affirm this fact. --Edward Koch, former Mayor of NYC";
    } else if (answer === 5) {
        return "Why would Kim Jong-un insult me by calling me 'old,' when I would NEVER call him 'short and fat?' Oh well, I try so hard to be his friend - and maybe someday that will happen! --Donald Trump";
    } else {
        return "I did not have sexual relations with that woman. --Bill Clinton";
    }
}
print(getQuote());

// 4. To-Do List, bottom right corner - Prompt string: adds random things to your list.
export function main3(): void {
    promptString("To Do:", yourList);
}
export function toDoList(): string {
    let toDoItem: number = random(1, 7);
    if (toDoItem === 1) {
        return "Call Mom.";
    } else if (toDoItem === 2) {
        return "CALL MOM!!!";
    } else if (toDoItem === 3) {
        return "Schedule colonoscopy.";
    } else if (toDoItem === 4) {
        return "Re-schedule Root Canal.";
    } else if (toDoItem === 5) {
        return "Pay rent (5 DAYS LATE!!!)";
    } else {
        return "";
    }
}
export function yourList(name: string): void {
    print(toDoList());
}
main3();
// How can we make this cumulative? Adding to the list the options we have, not what people input?

// 5. 

