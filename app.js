// document elements
const clock = document.getElementById('clock');
const goal = document.getElementById('goal');
const image = document.getElementById('image');

// const variables
const ONE_SECOND = 1000;
const ENTER_KEY_CODE = 13;
const END_KEY_CODE = 35;
const ESC_KEY_CODE = 27;
const defaultGoalText = "Input your goal and time!";
const defaultFinishedText = "It's time to take a break";
const defaultPauseText = " || paused";

// Images
const canselledCatSrc = "https://ichef.bbci.co.uk/news/976/cpsprodpb/12A9B/production/_111434467_gettyimages-1143489763.jpg"
const progressCatSrc = "http://www.leadervet.com/night.jpg"
const pauseCatSrc = "https://cathumor.net/wp-content/uploads/2015/03/Cat-humor-Good-Morning.jpg"
const finishedCatSrc = "https://ichef.bbci.co.uk/news/976/cpsprodpb/12A9B/production/_111434467_gettyimages-1143489763.jpg"

let secondsLeft = 0;
let seconds = minutes = hours = 0;
let state = "done"

class Timer {
    constructor() {
        this.defaultStates = ["progress", "pause", "canselled", "finished"];
        this.currentState = "canselled";
        this.secondsLeft = 0;
        this.seconds = minutes = hours = 0;
    }

    checkState() {
        switch(this.currentState) {
            case "progress":
                this.run(this.secondsLeft--);
                image.src = progressCatSrc;
                break;
            case "pause":
                clock.innerText = defaultPauseText;
                image.src = pauseCatSrc;
                break;
            case "canselled":
                clock.innerText = "";
                goal.innerText = defaultGoalText;
                image.src = canselledCatSrc;
                break;
            case "finished":
                clock.innerText = defaultFinishedText;
                image.src = finishedCatSrc;
                break;
        }
    }

    setState(newState) {
        this.defaultStates.includes(newState) ? this.currentState = newState : console.log("Inappropriate state. Check 'SetState' parameters");
    }

    setTime(newTime) {
        newTime != NaN && newTime > 0 ? this.secondsLeft = newTime : alert("Enter correct time");
    }

    run(seconds) {
        // converting seconds to minutes and hours
        let timerText = "";
        if(this.secondsLeft <= 0) {
            this.setState("finished");
            document.getElementById("tone").play()
            this.checkState();
        }

        if (this.secondsLeft > 59) {
            minutes = Math.floor(this.secondsLeft / 60);
            seconds = this.secondsLeft % 60;
            timerText = `${minutes} : ${seconds}`;
            if (minutes > 59) {
                hours = Math.floor(minutes / 60);
                minutes = minutes % 60;
                timerText = `${hours} : ${minutes} : ${seconds}`;
            }
        } else {
            seconds = this.secondsLeft;
            timerText = `${seconds}`;
        }
        
        // formatting
        if (hours < 10) { hours = '0' + hours };
        if (minutes < 10) { minutes = '0' + minutes };
        if (seconds < 10) { seconds = '0' + seconds };
        
        // showing exact time left
        clock.innerText = timerText;
    }
}

function submitGoal() {
    const newGoal = document.getElementById("newGoal").value;
    const newTime = document.getElementById("minutesToWork").value;

    if(newGoal=="" || newTime=="" || newTime==NaN || newTime <= 0) 
    {
        alert("Enter correct goal and time");
        return;
    }
    
    document.getElementById("goal").innerText = newGoal;
    timer.setTime(newTime * 60);
    timer.setState("progress");
    timer.checkState();
}

function enableKeyboardInteractions() {
    this.addEventListener("keyup", function (event) {
        switch (event.keyCode) {
            case ENTER_KEY_CODE:
                submitGoal();
                break;
            case END_KEY_CODE:
                if(timer.currentState == "progress") {
                    timer.setState("pause");
                } else if (timer.currentState == "pause") {
                    timer.setState("progress");
                }
                
                timer.checkState();
                break;
            case ESC_KEY_CODE:
                timer.setState("canselled");
                timer.checkState();
                break;
        }
    });
}

//initialize
enableKeyboardInteractions();
let timer = new Timer();

function runEverySecond() {
    timer.checkState();
}

// update
setInterval(runEverySecond, ONE_SECOND)

