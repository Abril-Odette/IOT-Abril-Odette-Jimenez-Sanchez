// ---------- 1. Settings ----------
// Center blocks: [letter, spaces per side]. Each block has two columns (L and R).
var centerBlocks = [["A", 18], ["B", 17], ["C", 17], ["D", 16], ["E", 15]];
var topCount = 15;                   // single row on the top
var leftCount = 21;                  // single column on the left
var bottomCount = 13;                // single row on the bottom (first and last are accessible spaces)
var updateTime = 4000;               // the sensors update every 4 seconds (in milliseconds)

var spaces = [];                     // list with all the parking spaces
var paused = false;
var startTime = Date.now();


// ---------- 2. Draw the parking lot ----------
function createParkingLot() {
    var lot = document.getElementById("lot");

    lot.appendChild(createStrip("strip-left", "W", leftCount, false));
    lot.appendChild(createStrip("strip-top", "T", topCount, false));
    lot.appendChild(createLane("lane1", "←"));
    lot.appendChild(createCenter());
    lot.appendChild(createLane("lane2", "→"));
    lot.appendChild(createStrip("strip-bottom", "S", bottomCount, true));
}

// A single line of spaces (left, top or bottom)
function createStrip(className, prefix, count, accessibleEnds) {
    var strip = document.createElement("div");
    strip.className = "strip " + className;

    for (var n = 1; n <= count; n++) {
        var accessible = accessibleEnds && (n === 1 || n === count);
        var space = createSpace(prefix + "-" + n, n, accessible);
        strip.appendChild(space.element);
    }
    return strip;
}

// The five blocks in the center, with a lane between them
function createCenter() {
    var row = document.createElement("div");
    row.className = "center-row";

    for (var b = 0; b < centerBlocks.length; b++) {
        var letter = centerBlocks[b][0];
        var count = centerBlocks[b][1];

        row.appendChild(createAisle(b));

        var block = document.createElement("div");
        block.className = "block";

        var sides = ["L", "R"];
        for (var s = 0; s < sides.length; s++) {
            var column = document.createElement("div");
            column.className = "column";

            for (var n = 1; n <= count; n++) {
                var space = createSpace(letter + "-" + sides[s] + n, n, false);
                column.appendChild(space.element);
            }
            block.appendChild(column);
        }
        row.appendChild(block);
    }

    // One last lane at the end
    row.appendChild(createAisle(centerBlocks.length));
    return row;
}

// Horizontal lane with arrows (between the strips and the blocks)
function createLane(className, arrow) {
    var lane = document.createElement("div");
    lane.className = "lane " + className;

    for (var i = 0; i < 8; i++) {
        var span = document.createElement("span");
        span.textContent = arrow;
        lane.appendChild(span);
    }
    return lane;
}

// Vertical lane with arrows
function createAisle(number) {
    var aisle = document.createElement("div");
    aisle.className = "aisle";

    // The arrows change direction in every lane
    var arrow = (number % 2 === 0) ? "↓" : "↑";
    for (var i = 0; i < 4; i++) {
        var span = document.createElement("span");
        span.textContent = arrow;
        aisle.appendChild(span);
    }
    return aisle;
}

function createSpace(id, number, accessible) {
    var element = document.createElement("div");
    element.textContent = accessible ? "♿" : number;

    // Simulated sensor: random status when the page opens (about 60% occupied)
    var space = {
        id: id,
        status: (Math.random() < 0.6) ? "occupied" : "available",
        extra: accessible ? " accessible" : "",
        element: element
    };

    // Click = change the status manually
    element.addEventListener("click", function () {
        var newStatus = (space.status === "occupied") ? "available" : "occupied";
        setStatus(space, newStatus);
        updateDashboard();
    });

    spaces.push(space);
    showStatus(space, false);
    return space;
}


// ---------- 3. Change and show the status of a space ----------
function setStatus(space, newStatus) {
    space.status = newStatus;
    showStatus(space, true);
}

function showStatus(space, flash) {
    space.element.className = "space " + space.status + space.extra;
    space.element.title = space.id + " - " + (space.status === "occupied" ? "Occupied" : "Available");

    // Small flash so the change is easy to notice
    if (flash) {
        space.element.classList.add("flash");
        setTimeout(function () {
            space.element.classList.remove("flash");
        }, 700);
    }
}


// ---------- 4. Dashboard ----------
function updateDashboard() {
    var total = spaces.length;
    var occupied = 0;

    for (var i = 0; i < total; i++) {
        if (spaces[i].status === "occupied") {
            occupied++;
        }
    }

    var available = total - occupied;
    var percentage = Math.round((occupied / total) * 100);

    document.getElementById("total").textContent = total;
    document.getElementById("occupied").textContent = occupied;
    document.getElementById("available").textContent = available;
    document.getElementById("percentage").textContent = percentage + "%";

    // Occupancy bar: green, orange or red
    var bar = document.getElementById("bar");
    bar.style.width = percentage + "%";
    if (percentage >= 85) {
        bar.className = "bar-fill red-bar";
    } else if (percentage >= 60) {
        bar.className = "bar-fill orange";
    } else {
        bar.className = "bar-fill";
    }

    // Time of the last update
    document.getElementById("last-update").textContent = new Date().toLocaleTimeString();
}


// ---------- 5. Automatic updates (cars arriving and leaving) ----------
function carArrives() {
    var free = spaces.filter(function (s) { return s.status === "available"; });
    if (free.length > 0) {
        var chosen = free[Math.floor(Math.random() * free.length)];
        setStatus(chosen, "occupied");
    }
}

function carLeaves() {
    var busy = spaces.filter(function (s) { return s.status === "occupied"; });
    if (busy.length > 0) {
        var chosen = busy[Math.floor(Math.random() * busy.length)];
        setStatus(chosen, "available");
    }
}

function simulateSensors() {
    if (paused) {
        return;
    }

    var occupied = spaces.filter(function (s) { return s.status === "occupied"; }).length;
    var occupancy = occupied / spaces.length;

    // The "target" goes up and down slowly (between 25% and 85%), like a busy and a quiet moment
    var seconds = (Date.now() - startTime) / 1000;
    var target = 0.55 + 0.30 * Math.sin(seconds / 45);

    // If the lot is emptier than the target, more cars arrive than leave (and the opposite)
    var chanceToArrive = 0.5 + (target - occupancy) * 1.5;
    chanceToArrive = Math.min(0.9, Math.max(0.1, chanceToArrive));

    // Between 1 and 3 cars move in each update
    var movements = 1 + Math.floor(Math.random() * 3);
    for (var i = 0; i < movements; i++) {
        if (Math.random() < chanceToArrive) {
            carArrives();
        } else {
            carLeaves();
        }
    }

    updateDashboard();
}


// ---------- 6. Pause button ----------
document.getElementById("pause-button").addEventListener("click", function () {
    paused = !paused;
    this.textContent = paused ? "Resume simulation" : "Pause simulation";
    document.getElementById("sensor-status").textContent =
        paused ? "❚❚ Simulation paused" : "● Sensors online (simulated)";
});


// ---------- 7. Start ----------
createParkingLot();
updateDashboard();
setInterval(simulateSensors, updateTime);
