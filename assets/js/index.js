// References to DOM elements
const isNode = typeof require !== "undefined"; // Check if running in Node.js/Electron
const storage = isNode ? require("fs") : null;
const saveFilePath = isNode ? require("path").join(__dirname, "levelCompletionTimes.json") : null;

const inGameResetButton = document.getElementById("inGameResetButton");

const levelSelection = document.getElementById("levelSelection");
const mazeContainer = document.querySelector(".maze-container");
const gameContainer = document.getElementById("gameContainer");
const menuButton = document.getElementById("menuButton");
const levelAnnouncement = document.getElementById("levelAnnouncement");
const levelText = document.getElementById("levelText");

const menuButtonPopup = document.getElementById("menuButtonPopup");
menuButtonPopup.addEventListener("click", showLevelSelector);

// Get references to options button and options window
const optionsButton = document.getElementById("optionsButton");
const optionsWindow = document.getElementById("optionsWindow");
const closeOptionsButton = document.getElementById("closeOptionsButton");

const achievementsButton = document.getElementById('achievementsButton');
const achievementsModal = document.getElementById('achievementsModal');
const closeButton = achievementsModal.querySelector('.close-btn');

const animationContainer = document.getElementById('animationContainer');

const soundEffect = new Audio('blockhit3.mp3'); // Replace with your sound file path


document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const levelSelection = document.getElementById("levelSelection"); // Declare this variable
  const startGameButton = document.getElementById("startGameButton");
  const backgroundMusic = new Audio("./assets/audio/i careOST.mp3"); // Background music
  const volumeSlider = document.getElementById("volumeSlider"); // Slider
  const volumeValueDisplay = document.getElementById("volumeValue"); // Display value
  console.log(document.getElementById("levelAnnouncement")); // Log the element

  const unlockablesButton = document.getElementById("unlockablesButton")
  const unlockablesScreen = document.getElementById('fullscreenOverlay');
  const unlockablesBackButton = document.getElementById('unlockablesBackButton');
  
  console.log("Game is starting. Checking for saved timers...");
  loadLevelCompletionTimes();

  loadAchievementProgress();

  volumeValueDisplay.textContent = "10%";

  // Music settings
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.1;

  startGameButton.addEventListener("click", () => {
    // Hide start screen
    startScreen.style.display = "none";

    // Show level selection screen
    levelSelection.style.display = "flex";

    // Play background music
    backgroundMusic.play().catch((e) => {
      console.warn("Autoplay prevented", e);
    });
  });

  volumeSlider.addEventListener("input", () => {
    const volume = parseFloat(volumeSlider.value);
    backgroundMusic.volume = volume;

    // Update volume display
    volumeValueDisplay.textContent = Math.round(volume * 100) + "%";
  });

  let isAnimating = false; // Global flag to track if an animation is active
  let lastYPositions = {}; // Object to store the last Y position for each SVG
  const activeYPositions = []; // Array to track current spawn positions

  achievementsButton.addEventListener('click', () => {
    console.log("Loading progress before opening modal...");
    loadAchievementProgress(); // Ensure state is loaded
    resetAchievementUI();
    achievementsModal.classList.add('active');
    startAchievementAnimation();

    setTimeout(() => {
        updateAchievementUIAnimated();
    }, 500);
  });

  closeButton.addEventListener('click', () => {
    achievementsModal.classList.remove('active');
    clearAchievementAnimation();
  });

  function resetAchievementUI() {
    // Reset "The Brain" UI
    const brainProgressFill = document.querySelector(".progressFill.theBrain");
    const brainProgressPercentage = document.querySelector(".progressPercentage.theBrain");
    const brainAchievementStatus = document.querySelector(".achievementStatus.theBrain");

    brainProgressFill.style.width = "0%";
    brainProgressPercentage.textContent = "0%";
    brainAchievementStatus.textContent = "Locked";

    // Reset "The Tail" UI
    const tailProgressFill = document.querySelector(".progressFill.theTail");
    const tailProgressPercentage = document.querySelector(".progressPercentage.theTail");
    const tailAchievementStatus = document.querySelector(".achievementStatus.theTail");

    tailProgressFill.style.width = "0%";
    tailProgressPercentage.textContent = "0%";
    tailAchievementStatus.textContent = "Locked";
  }

  // Function to create and animate the SVG
  function createAchievementElement(svgConfig) {
    const { src, className, speed, size, id } = svgConfig;
    const modalHeight = achievementsModal.offsetHeight;
    const containerWidth = animationContainer.offsetWidth;

    let randomY;
    do {
        // Generate random Y position
        randomY = Math.random() * 0.6 * modalHeight + 0.2 * modalHeight;
    } while (
        (lastYPositions[id] !== undefined && Math.abs(randomY - lastYPositions[id]) < 100) || // Check distance from last Y for this SVG
        activeYPositions.some(pos => Math.abs(randomY - pos) < 100) // Check distance from all active positions
    );

    // Update positions
    lastYPositions[id] = randomY;
    activeYPositions.push(randomY);
    console.log(`Creating new SVG (${src}) at random Y:`, randomY);

    // Create the SVG element
    const svgElement = document.createElement("img");
    svgElement.src = src;
    svgElement.className = className;
    svgElement.style.width = size; // Set custom size
    svgElement.style.height = "auto"; // Maintain aspect ratio

    // Position SVG off-screen and set random Y
    svgElement.style.position = "absolute";
    svgElement.style.top = `${randomY}px`;
    svgElement.style.left = `-${parseInt(size, 10) || 200}px`; // Start fully off-screen

    animationContainer.appendChild(svgElement);

    // Animate with JavaScript
    const endPosition = containerWidth + parseInt(size, 10) || 200; // Fully off-screen to the right
    svgElement.style.transition = `transform ${speed}s linear`;

    setTimeout(() => {
        svgElement.style.transform = `translateX(${endPosition}px)`;
    }, 100);

    // Cleanup and respawn after animation
    svgElement.addEventListener("transitionend", () => {
        console.log(`SVG (${src}) transition completed. Removing and respawning.`);
        svgElement.remove();

        // Remove Y position from activeYPositions when animation ends
        const index = activeYPositions.indexOf(randomY);
        if (index !== -1) activeYPositions.splice(index, 1);

        createAchievementElement(svgConfig);
    });
  }

  // Function to start the animation loop
  function startAchievementAnimation() {
    console.log("Starting the achievement animation loop.");

    // Configurations for each SVG
    const configs = [
        { 
            id: "achievement1", // Unique ID for tracking spawn positions
            src: "assets/images/achievementelement1.svg", 
            className: "moving-achievement", 
            speed: 22, 
            size: "200px" 
        },
        { 
            id: "achievement2", 
            src: "assets/images/achievementelement2.svg", 
            className: "moving-achievement-small", 
            speed: 28, // Slower
            size: "100px" // Smaller
        },
        { 
            id: "achievement3", 
            src: "assets/images/achievementelement3.svg", 
            className: "moving-achievement-tiny", 
            speed: 32, // Slower than the second one
            size: "80px" // Smaller than the second one
        }
    ];

    // Start animations for each SVG
    configs.forEach(config => createAchievementElement(config));
  }

  // Function to clear animations and log
  function clearAchievementAnimation() {
    console.log("Clearing all animations.");
    animationContainer.innerHTML = ""; // Clear remaining elements
    lastYPositions = {}; // Reset last Y positions for all SVGs
    activeYPositions.length = 0; // Clear active Y positions
  }

});
function animateProgressUpdate(target, updateCallback, completeCallback) {
  let current = 0; // Start from 0%
  const interval = setInterval(() => {
      current += 5; // Increment progress by 5%
      if (current >= target) {
          clearInterval(interval); // Stop when reaching the target
          current = target; // Ensure exact target value
          if (completeCallback) completeCallback(); // Final callback
      }
      updateCallback(current); // Update UI
  }, 100); // Interval time in ms
}

function updateAchievementUIAnimated() {
  const brainProgressFill = document.querySelector(".progressFill.theBrain");
  const brainProgressPercentage = document.querySelector(".progressPercentage.theBrain");
  const brainAchievementStatus = document.querySelector(".achievementStatus.theBrain");

  const tailProgressFill = document.querySelector(".progressFill.theTail");
  const tailProgressPercentage = document.querySelector(".progressPercentage.theTail");
  const tailAchievementStatus = document.querySelector(".achievementStatus.theTail");

  const brainTarget = achievementProgress.theBrain.progress;
  const tailTarget = achievementProgress.theTail.progress;

  let brainCurrent = 0;
  let tailCurrent = 0;

  // Use a single interval to update both
  const interval = setInterval(() => {
      brainCurrent = Math.min(brainCurrent + 5, brainTarget);
      tailCurrent = Math.min(tailCurrent + 5, tailTarget);

      // Update Brain Progress
      brainProgressFill.style.width = `${brainCurrent}%`;
      brainProgressPercentage.textContent = `${brainCurrent}%`;

      // Update Tail Progress
      tailProgressFill.style.width = `${tailCurrent}%`;
      tailProgressPercentage.textContent = `${tailCurrent}%`;

      // Check if both are complete
      if (brainCurrent === brainTarget && tailCurrent === tailTarget) {
          clearInterval(interval);

          // Update final status
          brainAchievementStatus.textContent = achievementProgress.theBrain.status;
          tailAchievementStatus.textContent = achievementProgress.theTail.status;
      }
  }, 100); // Adjust interval time as needed
}

let activeTimeouts = []; // Track all active timeouts
let activeIntervals = []; // Track all active intervals

function clearAllTimers() {
  console.log("Clearing all active timers...");

  activeTimeouts.forEach((timeout) => clearTimeout(timeout));
  activeTimeouts = []; // Reset the list

  activeIntervals.forEach((interval) => clearInterval(interval));
  activeIntervals = []; // Reset the list

  console.log("All timers cleared.");
}

function trackedSetInterval(callback, interval) {
  const intervalId = setInterval(callback, interval);
  activeIntervals.push(intervalId);
  return intervalId;
}


document.getElementById("achievementsButton").addEventListener("click", () => {
  console.log("Loading progress before opening achievements...");
  loadAchievementProgress(); // Load progress into memory

  console.log("Current achievementProgress:", achievementProgress);

  updateAchievementUIAnimated(); // Update the UI with loaded progress
});

let achievementProgress = {
  theBrain: {
    title: "The Brain",
    
    progress: 0,
    status: "Locked",
  },
  theTail: {
    title: "The Tail",
    
    progress: 0,
    status: "Locked",
  },
};

function saveAchievementProgress() {
  try {
    const progressJSON = JSON.stringify(achievementProgress);
    if (typeof require !== "undefined") {
      const fs = require("fs");
      const path = require("path");
      const savePath = path.join(__dirname, "achievementProgress.json");
      fs.writeFileSync(savePath, progressJSON);
      console.log("Progress saved to file.");
    } else {
      localStorage.setItem("achievementProgress", progressJSON);
      console.log("Progress saved to localStorage:", progressJSON);
    }
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
}

function loadAchievementProgress() {
  let savedProgress = {};
  if (typeof require !== "undefined") {
    const fs = require("fs");
    const path = require("path");
    const savePath = path.join(__dirname, "achievementProgress.json");

    if (fs.existsSync(savePath)) {
      try {
        savedProgress = JSON.parse(fs.readFileSync(savePath, "utf8"));
      } catch (err) {
        console.error("Failed to load progress:", err);
      }
    }
  } else {
    savedProgress = JSON.parse(localStorage.getItem("achievementProgress")) || {};
  }

  achievementProgress = {
    ...achievementProgress, // Defaults
    ...savedProgress, // Saved data
    theBrain: { ...achievementProgress.theBrain, ...savedProgress.theBrain },
    theTail: { ...achievementProgress.theTail, ...savedProgress.theTail },
  };

  console.log("Loaded progress:", achievementProgress);
}

function updateAchievementUIAnimated() {
  console.log("Updating UI with:", achievementProgress);

  const brainProgressFill = document.querySelector(".progressFill.theBrain");
  const brainProgressPercentage = document.querySelector(".progressPercentage.theBrain");
  const brainAchievementStatus = document.querySelector(".achievementStatus.theBrain");

  const tailProgressFill = document.querySelector(".progressFill.theTail");
  const tailProgressPercentage = document.querySelector(".progressPercentage.theTail");
  const tailAchievementStatus = document.querySelector(".achievementStatus.theTail");

  // Update "The Brain" progress
  if (brainProgressFill && achievementProgress.theBrain) {
    brainProgressFill.style.width = `${achievementProgress.theBrain.progress}%`;
    brainProgressPercentage.textContent = `${achievementProgress.theBrain.progress}%`;
    brainAchievementStatus.textContent = achievementProgress.theBrain.status;
  }

  // Update "The Tail" progress
  if (tailProgressFill && achievementProgress.theTail) {
    tailProgressFill.style.width = `${achievementProgress.theTail.progress}%`;
    tailProgressPercentage.textContent = `${achievementProgress.theTail.progress}%`;
    tailAchievementStatus.textContent = achievementProgress.theTail.status;
  }
}

unlockablesButton.addEventListener('click', () => {
  unlockablesScreen.style.display = 'flex';
});

unlockablesBackButton.addEventListener('click', () => {
  unlockablesScreen.style.display = 'none';
});

let checkpointsTouched = { first: false, second: false };

let checkpoints = []; // Change to an array to hold multiple checkpoints

function initializeCheckpoints() {
    checkpoints = [];
    checkpointsTouched = { first: false, second: false }; // Reset state

    if (currentLevel === 8) {
        const checkpoint1 = { x: 300, y: 0, size: 20, touched: false, solid: false };
        const checkpoint2 = { x: 60, y: 0, size: 20, touched: false, solid: false };
        checkpoints.push(checkpoint1, checkpoint2);
    } else if (currentLevel === 9) {
        const level9Checkpoint = { x: 120, y: 320, size: 20, touched: false, solid: false };
        checkpoints.push(level9Checkpoint);
    } else if (currentLevel === "6secret") {
        const secretCheckpoint = { x: 340, y: 200, size: 20, touched: false, solid: false, color: "#00FF00" }; // Key checkpoint
        checkpoints.push(secretCheckpoint);
    }
}

// Draw the checkpoints on the canvas
function drawCheckpoints() {
  if (checkpoints.length === 0) return;

  const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";

  checkpoints.forEach((checkpoint) => {
    // For secret level checkpoint, only draw if not touched
    if (currentLevel === "6secret") {
      if (!checkpoint.touched) {
        ctx.fillStyle = checkpoint.color || "#00FF00";
        ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.size, checkpoint.size);
      }
    } else if (currentLevel === 9) {
      // Special handling for level 9 checkpoints
      if (checkpoint.solid) {
        // Solid checkpoint
        ctx.fillStyle = isEquipped ? "#8A314E" : "#222222";
        ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.size, checkpoint.size);
      } else if (!checkpoint.touched) {
        // Non-solid, untouched checkpoint
        ctx.fillStyle = isEquipped ? "#F96D99" : "#999999";
        ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.size, checkpoint.size);
      }
    } else {
      // For all other checkpoints
      if (!checkpoint.touched) {
        ctx.fillStyle = isEquipped ? "#F96D99" : "#999999";
        ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.size, checkpoint.size);
      }
    }
  });
}

function checkCheckpointCollision() {
  if (!checkpoints || checkpoints.length === 0) return;

  let shouldRedraw = false;

  checkpoints.forEach((checkpoint, index) => {
    const isPlayerOnCheckpoint =
      player.x < checkpoint.x + checkpoint.size &&
      player.x + player.size > checkpoint.x &&
      player.y < checkpoint.y + checkpoint.size &&
      player.y + player.size > checkpoint.y;

    if (currentLevel === 9) {
      if (isPlayerOnCheckpoint && !checkpoint.touched) {
        // Mark as touched but don't make solid yet
        checkpoint.touched = true;
        shouldRedraw = true;
        console.log("Checkpoint touched, waiting for player to leave...");
      } else if (checkpoint.touched && !checkpoint.solid && !isPlayerOnCheckpoint) {
        // Player has left the checkpoint area, now make it solid
        checkpoint.solid = true;
        shouldRedraw = true;
        console.log(`Checkpoint at (${checkpoint.x}, ${checkpoint.y}) is now solid!`);
      }
    } else if (isPlayerOnCheckpoint && !checkpoint.touched) {
      // Handle other levels' checkpoints as before
      if (currentLevel === 8) {
        checkpoint.touched = true;
        if (index === 0) {
          localStorage.setItem('pathOneCompleted', true);
        }
        if (index === 1) {
          localStorage.setItem('pathTwoCompleted', true);
        }

        // Calculate progress
        const pathOneCompleted = localStorage.getItem('pathOneCompleted') === 'true';
        const pathTwoCompleted = localStorage.getItem('pathTwoCompleted') === 'true';

        let progress = 0;
        if (pathOneCompleted) progress += 50;
        if (pathTwoCompleted) progress += 50;

        achievementProgress.theBrain.progress = progress;
        saveAchievementProgress();

        if (progress === 100) {
          achievementProgress.theBrain.status = "Unlocked";
          saveAchievementProgress();
        }
      } else if (currentLevel === "6secret") {
        checkpoint.touched = true;
        console.log("Got the secret key!");
        localStorage.setItem('hasSecretKey', 'true');
        
        // Remove the key checkpoint
        checkpoints = checkpoints.filter(cp => cp !== checkpoint);
        
        // Add the return gap
        gaps.push({
          level: "6secret",
          x: 0,
          y: 131,
          width: 20,
          height: 20,
          isReturnGap: true,
          color: "rgb(153, 153, 153)"
        });
        
        // Redraw everything to show changes
        recolorMaze();
        renderMazeWithGaps(ctx, gaps);
        drawCheckpoints();
        drawPlayer();
      }
    }
  });

  // Only redraw if changes were made
  if (shouldRedraw) {
    recolorMaze();
    drawCheckpoints();
    drawPlayer();
  }
}

const levelCompletionTimes = {};

document.addEventListener("DOMContentLoaded", () => {
  startGameButton.addEventListener("click", () => {
    startScreen.style.display = "none"; // Hide the menu
    console.log("Transitioning to game...");
  });
});

function updateUnlockablesUI() {
  const unlockablesCenterWindow = document.getElementById("unlockablesCenterWindow");
  unlockablesCenterWindow.innerHTML = "";

  let hasUnlockables = false;

  // Ensure "isEquipped" is initialized only once
  let isBrainPaletteEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  let isTailEffectEquipped = localStorage.getItem("isTailEffectEquipped") === "true";

  // Check if "The Brain" achievement is unlocked
  if (achievementProgress.theBrain.status === "Unlocked") {
      hasUnlockables = true;

      unlockablesCenterWindow.innerHTML = "";

      // Disable flex layout of the center window
      unlockablesCenterWindow.style.display = "block"; // Switch to block layout for stacking
      unlockablesCenterWindow.style.alignItems = "flex-start";

      // Create the unlockable container for "The Brain"
      const unlockable = document.createElement("div");
      unlockable.style.display = "flex";
      unlockable.style.justifyContent = "space-between";
      unlockable.style.alignItems = "center";
      unlockable.style.width = "90%";
      unlockable.style.margin = "20px auto 0"; // Align to top with extra margin at the top
      unlockable.style.padding = "0px"; // Increased padding for larger height
      unlockable.style.backgroundColor = "#222222";
      unlockable.style.borderRadius = "0px";
      unlockable.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0)";
      unlockable.style.color = "#CCCCCC";
      unlockable.style.minHeight = "120px"; // Further increase height

      // Title (left)
      const title = document.createElement("div");
      title.style.marginLeft = "70px";
      title.style.width = "268px"; // Limit the width
      title.style.fontSize = "29px"; // Adjust font size
      title.style.fontWeight = "bold";
      title.style.lineHeight = "1.2"; // Adjust line height for proper spacing
      title.style.textAlign = "center"; // Center text within the title container
      title.style.display = "flex";
      title.style.flexDirection = "column"; // Ensure multi-line text is treated as a column
      title.style.justifyContent = "center"; // Vertically align text
      title.style.gap = "10px"; // Add spacing between lines

      // "The Brain" text with custom background
      const brainText = document.createElement("span");
      brainText.textContent = "\"the brain\"";
      brainText.style.fontSize = "40px";
      brainText.style.fontStyle = "italic";
      brainText.style.fontWeight = "bold"; // Bold text
      brainText.style.fontFamily = "MS Mincho";
      brainText.style.backgroundColor = "#cccccc";
      brainText.style.color = "#D1406E";
      brainText.style.padding = "0px"; // Padding inside the text box
      brainText.style.borderRadius = "0px"; // Optional rounded corners
      brainText.style.display = "inline-block"; // Ensure proper box rendering

      // "Palette" text with custom background
      const paletteText = document.createElement("span");
      paletteText.style.width = "100px";
      paletteText.style.marginLeft = "35px";
      paletteText.textContent = "palette";
      paletteText.style.backgroundColor = "#cccccc";
      paletteText.style.color = "#222222";
      paletteText.style.padding = "0px"; // Padding inside the text box
      paletteText.style.borderRadius = "0px"; // Optional rounded corners
      paletteText.style.display = "inline-block"; // Ensure proper box rendering

      // Append the styled text elements to the title container
      title.appendChild(brainText);
      title.appendChild(paletteText);

      unlockable.appendChild(title);

      // Icon (middle)
      const icon = document.createElement("img");
      icon.src = "assets/images/brainpalette.svg"; // Path to the unlockable icon
      icon.alt = "Brain Palette Icon";
      icon.style.width = "200px"; // Adjust icon size
      icon.style.height = "200px";
      icon.style.margin = "0 15px"; // Add margin for spacing
      unlockable.appendChild(icon);

      // Equip Button (right)
      const equipButton = document.createElement("button");
      equipButton.textContent = isBrainPaletteEquipped ? "unequip" : "equip";
      equipButton.style.fontFamily = "CustomFont";
      equipButton.style.width = isBrainPaletteEquipped ? "145px" : "100px";
      equipButton.style.marginLeft = "10px"; // Bring the button closer to the icon
      equipButton.style.marginRight = "100px";
      equipButton.style.padding = "0px 0px"; // Adjust padding for larger height
      equipButton.style.fontSize = "34px";
      equipButton.style.backgroundColor = "#CCCCCC";
      equipButton.style.color = "#222222";
      equipButton.style.border = "none";
      equipButton.style.borderRadius = "0px";
      equipButton.style.cursor = "pointer";

      equipButton.addEventListener("click", () => {
          isBrainPaletteEquipped = !isBrainPaletteEquipped;
          equipButton.textContent = isBrainPaletteEquipped ? "unequip" : "equip";
          equipButton.style.width = isBrainPaletteEquipped ? "145px" : "100px";
          localStorage.setItem("isBrainPaletteEquipped", isBrainPaletteEquipped);

          console.log("Toggling equip state:", isBrainPaletteEquipped); // Debug log
          applyGameColors(isBrainPaletteEquipped); // Call the function
          updateCanvasBorder();        // Update canvas border
          updateTrackerContainerStyle();        // Update tracker container style
          updateTrackerItemStyles();            // Update tracker item styles
          updateTrackerHighlightEffect();       // Update highlight effect styles
          updateControlButtonStyles();          // Update control button styles
      });

      equipButton.addEventListener("mouseover", () => {
          equipButton.style.backgroundColor = "#222222";
          equipButton.style.color = "#CCCCCC";
      });
      equipButton.addEventListener("mouseout", () => {
          equipButton.style.backgroundColor = "#cccccc";
          equipButton.style.color = "#222222";
      });

      unlockable.appendChild(equipButton);

      // Append the unlockable to the center window
      unlockablesCenterWindow.appendChild(unlockable);

      applyGameColors(isBrainPaletteEquipped);
  }

  // Add a simple background for "The Tail" unlockable when unlocked
  if (achievementProgress.theTail.status === "Unlocked") {
      unlockablesCenterWindow.style.alignItems = "flex-start";
      hasUnlockables = true;

      const tailUnlockable = document.createElement("div");
      tailUnlockable.style.display = "flex";
      tailUnlockable.style.justifyContent = "space-between";
      tailUnlockable.style.alignItems = "center";
      tailUnlockable.style.width = "90%";
      tailUnlockable.style.margin = "20px auto 0";
      tailUnlockable.style.padding = "0px";
      tailUnlockable.style.backgroundColor = "#222222";
      tailUnlockable.style.color = "#CCCCCC";
      tailUnlockable.style.minHeight = "120px";

      // Title (left)
      const tailTitle = document.createElement("div");
      tailTitle.style.marginLeft = "70px";
      tailTitle.style.width = "268px";
      tailTitle.style.fontSize = "29px";
      tailTitle.style.fontWeight = "bold";
      tailTitle.style.lineHeight = "1.2";
      tailTitle.style.textAlign = "center";
      tailTitle.style.display = "flex";
      tailTitle.style.flexDirection = "column";
      tailTitle.style.justifyContent = "center";
      tailTitle.style.gap = "10px";

      const tailMainText = document.createElement("span");
      tailMainText.textContent = "\"the tail\"";
      tailMainText.style.fontSize = "40px";
      tailMainText.style.fontStyle = "italic";
      tailMainText.style.fontWeight = "bold";
      tailMainText.style.fontFamily = "MS Mincho";
      tailMainText.style.backgroundColor = "#F0A8C4";
      tailMainText.style.color = "#222222";
      tailMainText.style.display = "inline-block";

      const tailSubText = document.createElement("span");
      tailSubText.textContent = "effect";
      tailSubText.style.width = "100px";
      tailSubText.style.marginLeft = "35px";
      tailSubText.style.backgroundColor = "#cccccc";
      tailSubText.style.color = "#222222";
      tailSubText.style.display = "inline-block";

      tailTitle.appendChild(tailMainText);
      tailTitle.appendChild(tailSubText);

      tailUnlockable.appendChild(tailTitle);

      // Icon (middle)
      const tailIcon = document.createElement("img");
      tailIcon.src = "assets/images/taileffect3.svg";
      tailIcon.alt = "Tail Effect Icon";
      tailIcon.style.width = "230px";
      tailIcon.style.height = "200px";
      tailIcon.style.margin = "0 15px";
      tailUnlockable.appendChild(tailIcon);

      // Equip Button (right)
      const tailEquipButton = document.createElement("button");
      tailEquipButton.textContent = isTailEffectEquipped ? "unequip" : "equip";
      tailEquipButton.style.fontFamily = "CustomFont";
      tailEquipButton.style.width = isTailEffectEquipped ? "145px" : "100px";
      tailEquipButton.style.marginLeft = "10px";
      tailEquipButton.style.marginRight = "100px";
      tailEquipButton.style.fontSize = "34px";
      tailEquipButton.style.backgroundColor = "#CCCCCC";
      tailEquipButton.style.color = "#222222";
      tailEquipButton.style.border = "none";
      tailEquipButton.style.cursor = "pointer";

      tailEquipButton.addEventListener("click", () => {
          isTailEffectEquipped = !isTailEffectEquipped;
          tailEquipButton.textContent = isTailEffectEquipped ? "unequip" : "equip";
          tailEquipButton.style.width = isTailEffectEquipped ? "145px" : "100px";
          localStorage.setItem("isTailEffectEquipped", isTailEffectEquipped);

          if (isTailEffectEquipped) {
              console.log("Tail effect equipped! Add your changes here.");
          } else {
              unequipTailEffect();
              console.log("Tail effect unequipped! Revert changes here.");
          }
      });

      tailEquipButton.addEventListener("mouseover", () => {
          tailEquipButton.style.backgroundColor = "#222222";
          tailEquipButton.style.color = "#CCCCCC";
      });
      tailEquipButton.addEventListener("mouseout", () => {
          tailEquipButton.style.backgroundColor = "#cccccc";
          tailEquipButton.style.color = "#222222";
      });

      tailUnlockable.appendChild(tailEquipButton);

      unlockablesCenterWindow.appendChild(tailUnlockable);
  }

  if (!hasUnlockables) {
      // Re-enable flex layout if there are no unlockables
      unlockablesCenterWindow.style.display = "flex"; // Re-enable flex layout for normal behavior
      unlockablesCenterWindow.style.alignItems = "center";
      unlockablesCenterWindow.innerHTML = "nothing here... for now";
  }
}

function unequipTailEffect() {
  console.log("Unequipping tail effect. Clearing trail and resetting state.");
  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

  // Reset related state
  activeTrailSegments = []; // Assuming trail segments are tracked in this array
  localStorage.setItem("isTailEffectEquipped", false);
}

// Call this function when the unlockables screen is shown
unlockablesButton.addEventListener("click", () => {
  updateUnlockablesUI();
  unlockablesScreen.style.display = "flex";
});

function applyGameColors(isEquipped) {
  const levelAnnouncement = document.getElementById("levelAnnouncement");
  const levelText = document.getElementById("levelText");
  const mazeContainer = document.querySelector(".maze-container");
  const timerDisplay = document.getElementById("timerDisplay");
  const trackerContainer = document.querySelector(".tracker-container");
  const controls = document.querySelector(".controls");

  if (!mazeContainer || !trackerContainer || !controls || !timerDisplay) {
    console.error("One or more elements not found!");
    return;
  }

  // Define the colors
  const baseColor = isEquipped ? "#FF6A99" : "#999999";
  const highlightColor = isEquipped ? "#FFADC7" : "#CCCCCC";
  const announcementBgColor = isEquipped ? "#222222" : "#222222";
  const textBgColor = isEquipped ? "#7E2D47" : "#222222";
  const mazeColor = isEquipped ? "#F96D99" : "#999999"; // Maze container color
  const timerColor = isEquipped ? "#FF6A99" : "#CCCCCC"; // Timer display color
  const trackerBgColor = isEquipped ? "#8A314E" : "#222222"; // Tracker background
  const trackerTextColor = isEquipped ? "#FF6A99" : "#CCCCCC"; // Tracker text color
  const trackerBorderColor = isEquipped ? "#FF6A99" : "#CCCCCC"; // Tracker border color
  const buttonBgColor = isEquipped ? "#8A314E" : "#222222"; // Control button background
  const buttonTextColor = isEquipped ? "#F96D99" : "#999999"; // Control button text
  const buttonHoverBgColor = isEquipped ? "#F96D99" : "#999999"; // Hover background
  const buttonHoverTextColor = isEquipped ? "#8A314E" : "#222222"; // Hover text color

  // Update announcement and text background colors
  levelAnnouncement.style.backgroundColor = announcementBgColor;
  levelText.style.backgroundColor = textBgColor;

  // Update maze container background color
  mazeContainer.style.backgroundColor = mazeColor;

  // Debugging current maze container color
  console.log("Previous Maze Color:", getComputedStyle(mazeContainer).backgroundColor);

  // Force update of maze container background color
  mazeContainer.style.backgroundColor = "";
  setTimeout(() => {
    mazeContainer.style.backgroundColor = mazeColor;
    console.log("Updated Maze Color:", mazeColor);
  }, 50);

  // Update timer display color
  timerDisplay.style.color = timerColor;

  // Update tracker container styles
  trackerContainer.style.backgroundColor = trackerBgColor;
  trackerContainer.style.color = trackerTextColor;
  trackerContainer.style.border = `2px solid ${trackerBorderColor}`;
  trackerContainer.style.setProperty("--highlight-bg-color", highlightColor); // For animation

  // Update control button styles using CSS variables
  controls.style.setProperty("--button-bg-color", buttonBgColor);
  controls.style.setProperty("--button-color", buttonTextColor);
  controls.style.setProperty("--button-hover-bg-color", buttonHoverBgColor);
  controls.style.setProperty("--button-hover-color", buttonHoverTextColor);

  // Get all spans in levelText
  const letters = levelText.querySelectorAll("span");
  letters.forEach((span) => {
    span.style.color = baseColor; // Set base color
  });

  // Sequentially highlight letters
  const totalDuration = 2000; // Total animation duration
  const highlightDuration = 100; // Highlight duration per letter
  const delayBeforeHighlight = 300; // Delay before starting
  const interval = Math.min(
    (totalDuration - delayBeforeHighlight - highlightDuration) / Math.max(letters.length - 1, 1),
    highlightDuration
  );

  letters.forEach((span, index) => {
    setTimeout(() => {
      span.style.color = highlightColor; // Highlight the letter
      setTimeout(() => {
        span.style.color = baseColor; // Revert to base color
      }, highlightDuration); // Wait before reverting
    }, delayBeforeHighlight + index * interval);
  });
}

let timerInterval;
let startTime;

function startTimer() {
  startTime = Date.now(); // Reset the start time
  clearInterval(timerInterval); // Clear any previous intervals
  timerInterval = setInterval(() => {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, "0");
    const seconds = String(elapsedTime % 60).padStart(2, "0");
    document.getElementById(
      "timerDisplay"
    ).textContent = `time: ${minutes}:${seconds}`;
  }, 1000);
}

function stopTimer() {
  // Clear the timer interval
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Display the elapsed time in the win popup
function getElapsedTime() {
  if (!startTime) return 0;
  return Date.now() - startTime;
}

function hexToRgb(hex) {
  // Convert hex code to RGB
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(
    shorthandRegex,
    (m, r, g, b) => r + r + g + g + b + b
  );
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);

  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function recolorMenuElement(hexColor) {
  const menuElementImage = document.getElementById("menuElement");
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = menuElementImage.naturalWidth;
  offscreenCanvas.height = menuElementImage.naturalHeight;
  const offscreenCtx = offscreenCanvas.getContext("2d");

  // Disable image smoothing for pixel art sharpness
  offscreenCtx.imageSmoothingEnabled = false;

  // Draw the original image onto the canvas
  offscreenCtx.drawImage(menuElementImage, 0, 0);

  // Get image data
  const imageData = offscreenCtx.getImageData(
    0,
    0,
    menuElementImage.naturalWidth,
    menuElementImage.naturalHeight
  );
  const data = imageData.data;

  // Convert the hex color to RGB
  const newColor = hexToRgb(hexColor);
  if (!newColor) {
    console.error("Invalid hex color provided.");
    return;
  }

  // Replace black (0, 0, 0, non-transparent) pixels with the desired color
  for (let i = 0; i < data.length; i += 4) {
    if (
      data[i] === 0 &&
      data[i + 1] === 0 &&
      data[i + 2] === 0 &&
      data[i + 3] !== 0
    ) {
      data[i] = newColor.r; // Red
      data[i + 1] = newColor.g; // Green
      data[i + 2] = newColor.b; // Blue
    }
  }

  // Update the canvas with the recolored image data
  offscreenCtx.putImageData(imageData, 0, 0);

  // Replace the original image with the recolored canvas data
  menuElementImage.src = offscreenCanvas.toDataURL();
}

// Example usage: Set the desired hex color (e.g., "#FF8552")
document.getElementById("menuElement").addEventListener("load", () => {
  recolorMenuElement("#CCCCCC");
});

document.getElementById("mainMenuButton").addEventListener("click", () => {
  // Hide the level selection screen
  document.getElementById("levelSelection").style.display = "none";
  // Show the start screen
  document.getElementById("startScreen").style.display = "flex";

  // Stop the timer
  stopTimer();

  // Reset the timer display
  document.getElementById("timerDisplay").textContent = "Time: 00:00";

  // Update level completion times in the level selector
  updateLevelCompletionTime();
  saveAchievementProgress(); // Ensure this uses the current state
  loadAchievementProgress();

  // Optional: Stop any level music or reset settings
  console.log("Returning to Main Menu...");
});

document.getElementById("resetButton").addEventListener("click", () => {
  // Show the custom confirmation modal
  const modal = document.getElementById("resetConfirmationModal");
  modal.classList.remove("hidden");
});

document.getElementById("confirmReset").addEventListener("click", () => {
  const isNode = typeof require !== "undefined";
  const storage = isNode ? require("fs") : null;
  const saveFilePath = isNode
    ? require("path").join(__dirname, "levelCompletionTimes.json")
    : null;
  const achievementFilePath = isNode
    ? require("path").join(__dirname, "achievementProgress.json")
    : null;

  // Clear achievements and unlockables
  resetAchievementsAndUnlockables();

  if (isNode) {
    // Clear files in Node.js/Electron
    if (storage.existsSync(saveFilePath)) storage.unlinkSync(saveFilePath);
    if (storage.existsSync(achievementFilePath)) storage.unlinkSync(achievementFilePath);
  } else {
    // Clear localStorage
    localStorage.removeItem("levelCompletionTimes");
    localStorage.removeItem("achievementProgress");
    localStorage.removeItem("pathOneCompleted");
    localStorage.removeItem("pathTwoCompleted");
    localStorage.removeItem("isBrainPaletteEquipped"); // Clear palette state
    localStorage.removeItem("isTailEffectEquipped"); // Clear tail effect state
  }

  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  console.log("Trail effect cleared on data reset.");

  // Reset colors to default
  resetColorsToDefault();

  // Reset unlockable state and UI
  resetUnlockables(); // Call the function to clear the UI

  // Hide modal and show notification
  document.getElementById("resetConfirmationModal").classList.add("hidden");
  const notification = document.getElementById("resetNotification");
  notification.textContent = "All data has been reset.";
  notification.classList.remove("hidden");

  // Hide notification after 2 seconds
  setTimeout(() => {
    notification.classList.add("hidden");
  }, 2000);
});

function resetAchievementsAndUnlockables() {
  // Reset in-memory achievement progress
  achievementProgress = {
    theBrain: {
      title: "The Brain",
      
      status: "Locked", // Reset to locked
      progress: 0, // Reset progress
    },
    theTail: {
      title: "The Tail",
      
      status: "Locked", // Reset to locked
      progress: 0, // Reset progress
    },
  };

  // Save updated achievements to localStorage or file
  saveAchievementProgress();

  // Update UI
  updateAchievementUIAnimated();

  // Reset unlockables UI
  resetUnlockables();
}

function resetUnlockables() {
  // Clear unlockables data
  

  // Update the UI to show no unlockables
  const unlockablesCenterWindow = document.getElementById("unlockablesCenterWindow");
  unlockablesCenterWindow.innerHTML = "nothing here... for now";

  // Reset styles to default
  unlockablesCenterWindow.style.display = "flex";
  applyGameColors(false); // Revert game colors to default
}


document.getElementById("cancelReset").addEventListener("click", () => {
  // Simply hide the modal without resetting anything
  document.getElementById("resetConfirmationModal").classList.add("hidden");
});

function resetColorsToDefault() {
  const levelAnnouncement = document.getElementById("levelAnnouncement");
  const levelText = document.getElementById("levelText");

  // Default colors
  const defaultBackgroundColor = "#222222";
  const defaultTextBackgroundColor = "#222222";
  const defaultTextColor = "#999999";

  // Reset announcement and text background colors
  levelAnnouncement.style.backgroundColor = defaultBackgroundColor;
  levelText.style.backgroundColor = defaultTextBackgroundColor;

  // Reset text and spans to default colors
  levelText.style.color = defaultTextColor;
  const letters = levelText.querySelectorAll("span");
  letters.forEach((span) => {
    span.style.color = defaultTextColor; // Reset all span colors
  });

  console.log("UI elements reset to default colors.");
}

// Save completion times
function saveLevelCompletionTime(level, time) {
  console.log(`Attempting to save time for ${level}: ${time}`);

  const isNode = typeof require !== "undefined"; // Check if running in Node.js/Electron
  const storage = isNode ? require("fs") : null;
  const saveFilePath = isNode
    ? require("path").join(__dirname, "levelCompletionTimes.json")
    : null;

  let savedTimes = {};

  if (isNode) {
    // Node.js/Electron: Load existing times from the JSON file
    if (storage.existsSync(saveFilePath)) {
      try {
        savedTimes = JSON.parse(storage.readFileSync(saveFilePath, "utf8"));
      } catch (err) {
        console.error("Failed to read save file:", err);
        savedTimes = {};
      }
    }
  } else {
    // Browser: Load existing times from localStorage
    savedTimes = JSON.parse(localStorage.getItem("levelCompletionTimes")) || {};
  }

  const currentFastestTime = savedTimes[level];

  // Check if the new time is faster than the current saved time
  if (!currentFastestTime || isNewTimeFaster(currentFastestTime, time)) {
    savedTimes[level] = time; // Update with the new fastest time

    if (isNode) {
      // Save to JSON file in Node.js/Electron
      try {
        storage.writeFileSync(saveFilePath, JSON.stringify(savedTimes, null, 2));
        console.log(`New fastest time saved for ${level}: ${time} in file`);
      } catch (err) {
        console.error("Failed to save time to file:", err);
      }
    } else {
      // Save to localStorage in browser
      localStorage.setItem("levelCompletionTimes", JSON.stringify(savedTimes));
      console.log(`New fastest time saved for ${level}: ${time} in localStorage`);
    }
  } else {
    console.log(`Time not updated. Current fastest for ${level}: ${currentFastestTime}`);
  }

  // Verification step
  let storedTimes;
  if (isNode) {
    // Verify saved time from file
    try {
      storedTimes = JSON.parse(storage.readFileSync(saveFilePath, "utf8"));
    } catch (err) {
      console.error("Failed to verify saved time from file:", err);
      storedTimes = {};
    }
  } else {
    // Verify saved time from localStorage
    storedTimes = JSON.parse(localStorage.getItem("levelCompletionTimes"));
  }

  if (storedTimes && storedTimes[level] === time) {
    console.log(`Timer successfully saved for ${level}: ${time}`);
  } else {
    console.error(`Failed to save timer for ${level}.`);
  }
}

// Helper function to compare times
function isNewTimeFaster(currentTime, newTime) {
  const [currentMinutes, currentSeconds] = currentTime.split(':').map(Number);
  const [newMinutes, newSeconds] = newTime.split(':').map(Number);

  const currentTotalSeconds = currentMinutes * 60 + currentSeconds;
  const newTotalSeconds = newMinutes * 60 + newSeconds;

  return newTotalSeconds < currentTotalSeconds;
}

// Load saved completion times
function loadLevelCompletionTimes() {
  const isNode = typeof require !== "undefined"; // Check if running in Node.js/Electron
  const storage = isNode ? require("fs") : null;
  const saveFilePath = isNode
    ? require("path").join(__dirname, "levelCompletionTimes.json")
    : null;

  let savedTimes = {};

  if (isNode) {
    // Load timers from the JSON file in Node.js/Electron
    if (storage.existsSync(saveFilePath)) {
      try {
        savedTimes = JSON.parse(storage.readFileSync(saveFilePath, "utf8"));
        console.log("Loaded saved timers from file:", savedTimes);
      } catch (err) {
        console.error("Failed to read save file:", err);
        savedTimes = {};
      }
    } else {
      console.warn("No save file found. Starting with empty timers.");
    }
  } else {
    // Load timers from localStorage in the browser
    savedTimes = JSON.parse(localStorage.getItem("levelCompletionTimes")) || {};
    if (Object.keys(savedTimes).length === 0) {
      console.warn("No saved timers found in localStorage.");
    } else {
      console.log("Loaded saved timers from localStorage:", savedTimes);
    }
  }

  // Update the UI for loaded timers
  for (const [level, time] of Object.entries(savedTimes)) {
    const elementId = `${level}Timer`; // Construct the ID
    const timerElement = document.getElementById(elementId);

    if (timerElement) {
      timerElement.textContent = `Time: ${time}`;
      timerElement.style.display = "block"; // Make sure it's visible
      console.log(`Loaded timer for ${level}: ${time}`);
    } else {
      console.error(`Timer element with ID '${elementId}' not found. Check your HTML.`);
    }
  }

  return savedTimes;
}

function displayLevelCompletionTime(level) {
  const elapsedTime = getElapsedTime(); // Get elapsed time in milliseconds
  const minutes = String(Math.floor(elapsedTime / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((elapsedTime % 60000) / 1000)).padStart(2, '0');
  const formattedTime = `${minutes}:${seconds}`;

  // Save to storage (only if it's the fastest)
  saveLevelCompletionTime(level, formattedTime);

  // Retrieve the fastest time to display
  const savedTimes = JSON.parse(localStorage.getItem('levelCompletionTimes')) || {};
  const fastestTime = savedTimes[level];

  // Display in UI
  const timerElement = document.getElementById(`level${level}Timer`);
  if (timerElement) {
    timerElement.textContent = `Time: ${fastestTime}`;
    timerElement.style.display = "block";
  }
}

let logoClickable = false; // Flag to control logo behavior

const levelPaths = {
  1: [
    "up",
    "right",
    "up",
    "right",
    "down",
    "left",
    "down",
    "left",
    "up",
    "right",
    "up",
    "right",
    "up",
    "left",
    "up",
    "left",
    "up",
    "left",
    "down",
    "left",
    "up",
    "right",
    "up",
    "left",
    "up",
    "right",
    "down",
    "right",
    "up",
  ],
  2: [
    "up",
    "right",
    "down",
    "left",
    "up",
    "right",
    "down",
    "left",
    "up",
    "right",
    "up",
    "left",
    "up",
    "right",
    "up",
    "right",
    "down",
    "right",
    "down",
    "left",
    "down",
    "right",
    "down",
    "left",
    "up",
    "right",
    "down",
    "right",
    "up",
    "left",
    "up",
  ],
  3: [
    "right",
    "up",
    "right",
    "up",
    "left",
    "down",
    "left",
    "up",
    "left",
    "down",
    "right",
    "up",
    "left",
    "up",
    "right",
    "up",
    "left",
    "up",
    "right",
    "up",
    "left",
    "down",
    "left",
    "down",
    "right",
    "down",
    "right",
    "up",
    "left",
    "up",
  ],
  4: [
    "down",
    "right",
    "up",
    "left",
    "down",
    "right",
    "up",
    "left",
    "up",
    "right",
    "up",
    "right",
    "down",
    "left",
    "down",
    "left",
    "down",
    "left",
    "up",
    "left",
    "up",
    "right",
    "up",
    "right",
    "down",
    "right",
    "down",
    "right",
    "up",
    "right",
    "up",
    "left",
    "up",
  ],
  5: [
    "up",
    "left",
    "up",
    "right",
    "up",
    "left",
    "up",
    "right",
    "down",
    "right",
    "up",
    "right",
    "down",
    "left",
    "up",
    "left",
    "up",
    "left",
    "down",
    "right",
    "up",
    "right",
    "up",
    "right",
    "up",
    "right",
    "up",
    "left",
    "up",
    "left",
    "down",
    "left",
    "up",
    "right",
    "up",
    "left",
    "down",
    "right",
    "up",
    "right",
    "up",
  ],
  6: [
    "left",
    "up",
    "right",
    "down",
    "left",
    "down",
    "right",
    "up",
    "left",
    "up",
    "right",
    "up",
    "left",
    "down",
    "right",
    "down",
    "right",
    "down",
    "right",
    "up",
    "left",
    "down",
    "right",
    "up",
    "right",
    "down",
    "right",
    "up",
    "right",
    "up",
    "right",
    "down",
    "left",
    "up",
    "left",
    "down",
    "left",
    "down",
    "left",
    "up",
    "right",
    "down",
    "right",
    "down",
    "right",
    "up",
  ],
  7:[
    "up","left","up","left","down","left","up","left","up","right","up","right","up","right","down","right","down","right","up","left",
    "up","right","up","left","down","right","up","left","up"
  ],
  8:[
    "up","left","up","left","up","left","down","right","up","right","down","right","up","right","up","right","down","left","up","left","down",
    "left","up","left","down","right","up","right","up","left","up","left","up","right","down","right","up"
  ],
  9:[
    "up","right","up","left","down","right","up","right","up","left","down","right","down","left","up","left","down","left","up","left","up","right",
    "down","left","up","left","up","left","up","left","up","right","up","left","up","right","up","left","down","right","down","right","up","right",
    "down","right","up","right","down","left","up","right","up","right","up","left","up","left","down","right","up","right","down","right","down","right",
    "down","left","up","right","down","left","up","left","up","right","down","right","up"
  ]
};

const hintUsed = {};

Object.keys(levelPaths).forEach((level) => {
  hintUsed[level] = false;
});

const hintButton = document.getElementById("hintButton"); // Reference to the Hint button
const hintLabel = document.getElementById("hintLabel");

playerLastPositions = [];

const directionMap = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const directionMapReversed = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

const directionsMapReversi = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

document.getElementById("leaveButton").addEventListener("click", () => {
  try {
    // Send the quit signal to Electron if available
    window.electronAPI.quitApp();
  } catch (error) {
    console.log("Electron API not detected, switching to browser behavior.");

    // Fallback for the browser: Show the thank you message
    const thanksMessage = document.getElementById("thanksMessage");
    thanksMessage.style.display = "block";

    // Hide other screens
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("levelSelection").style.display = "none";

    // Enable logo clickability
    logoClickable = true;
  }
});

function resetHints() {
  Object.keys(levelPaths).forEach((level) => {
    hintUsed[level] = false; // Reset all hints
  });
}

// Add event listener to the logo to reset the game screen
document.getElementById("logo").addEventListener("click", () => {
  if (logoClickable) {
    // Check if the logo is allowed to be clickable
    // Hide "Thanks for playing" message
    const thanksMessage = document.getElementById("thanksMessage");
    thanksMessage.style.display = "none";

    // Show start screen
    document.getElementById("startScreen").style.display = "flex";

    // Reset the flag
    logoClickable = false;
  }
});

let currentLevel = 1; // Start with level 1

let playerSteps = []; // Stores the player's moves
let lastCorrectStep = 0; // Tracks the last correct step

let levelAnnouncementTimeout = null; // Store timeout ID for the level announcement

function showHintConfirmation() {
  if (hintUsed[currentLevel]) {
    alert("You have already used your hint for this level!");
    return;
  }

  const modalOverlay = document.createElement("div");
  const modalContent = document.createElement("div");
  const message = document.createElement("p");
  const yesButton = document.createElement("button");
  const noButton = document.createElement("button");

  // Modal Overlay Styles
  modalOverlay.style.fontSize = "20px";
  modalOverlay.style.position = "fixed";
  modalOverlay.style.top = "0";
  modalOverlay.style.left = "0";
  modalOverlay.style.width = "100%";
  modalOverlay.style.height = "100%";
  modalOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  modalOverlay.style.display = "flex";
  modalOverlay.style.justifyContent = "center";
  modalOverlay.style.alignItems = "center";
  modalOverlay.style.zIndex = "1000";

  // Modal Content Styles
  modalContent.style.backgroundColor = "#222222"; // Dark gray background
  modalContent.style.padding = "20px";
  modalContent.style.borderRadius = "0px";
  modalContent.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  modalContent.style.textAlign = "center";
  modalContent.style.color = "#B2BAB1"; // Light gray-green text

  // Message Text Style
  message.innerHTML = "You have only ONE hint<br>..use it?";
  message.style.color = "#B2BAB1"; // Light gray-green color

  // Button Styles
  yesButton.textContent = "Yes";
  (yesButton.style.fontFamily = "CustomFont"), "sans-serif";
  yesButton.style.margin = "10px";
  yesButton.style.fontSize = "20px";
  yesButton.style.backgroundColor = "#222222"; // Matching modal background
  yesButton.style.color = "#B2BAB1"; // Text color

  noButton.textContent = "No";
  (noButton.style.fontFamily = "CustomFont"), "sans-serif";
  noButton.style.margin = "10px";
  noButton.style.fontSize = "20px";
  noButton.style.backgroundColor = "#222222"; // Matching modal background
  noButton.style.color = "#B2BAB1"; // Text color

  modalContent.appendChild(message);
  modalContent.appendChild(yesButton);
  modalContent.appendChild(noButton);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  yesButton.addEventListener("click", () => {
    hintUsed[currentLevel] = true; // Mark hint as used
    disableHintButton(); // Disable the button ONLY after confirming
    document.body.removeChild(modalOverlay);
    showHint();
  });

  noButton.addEventListener("click", () => {
    document.body.removeChild(modalOverlay);
  });
}

function showHint() {
  const correctPath = levelPaths[currentLevel];
  console.log("Hint function triggered");

  hintLabel.style.display = "block";
  setTimeout(() => {
    hintLabel.style.display = "none";
  }, 1500);

  // Case 1: Player hasn't moved yet
  if (playerSteps.length === 0) {
    highlightNextSteps(correctPath.slice(0, 2)); // Highlight first two buttons
    highlightPathOnMaze(correctPath.slice(0, 2), player.startX, player.startY);
    return;
  }

  // Case 2: Compare player's moves with the correct path
  let stepsCorrectSoFar = 0;

  for (let i = 0; i < playerSteps.length; i++) {
    if (playerSteps[i] === correctPath[i]) {
      stepsCorrectSoFar = i + 1; // Update the number of correct steps so far
    } else {
      // Incorrect step found, reset player and show hint
      lastCorrectStep = stepsCorrectSoFar;
      movePlayerToCorrectStep(stepsCorrectSoFar);
      highlightNextSteps(
        correctPath.slice(stepsCorrectSoFar, stepsCorrectSoFar + 2)
      ); // Buttons
      highlightPathOnMaze(
        correctPath.slice(stepsCorrectSoFar, stepsCorrectSoFar + 2),
        player.startX,
        player.startY
      );
      return;
    }
  }

  // Case 3: Player is correct so far, show the next two steps
  lastCorrectStep = stepsCorrectSoFar;
  highlightNextSteps(correctPath.slice(lastCorrectStep, lastCorrectStep + 2)); // Buttons
  highlightPathOnMaze(
    correctPath.slice(lastCorrectStep, lastCorrectStep + 2),
    player.startX,
    player.startY
  );
}

function highlightPathOnMaze(moves, startX, startY) {
  console.log("moves ->", moves);

  let currentX = startX; // Starting X position
  let currentY = startY; // Starting Y position

  const highlightColor = "rgba(255, 255, 0, 0.5)"; // Yellow transparent color

  executeAdvancedMoves(moves);

  // Redraw the player and exit to ensure they are visible
  drawExit();
  drawPlayer();
}

function processAdvancedNextMove(queue, cPlayer) {
  if (isMoving || queue.length === 0) return; // Prevent overlapping moves

  const direction = queue.shift(); // Get the next move in the queue

  startAdvancedMoving(direction, cPlayer, queue); // Start moving the player
}

function startAdvancedMoving(direction, cPlayer, queue) {
  if (isMoving) return; // Prevent overlapping movements

  isMoving = true; // Lock movement
  const speed = 1;
  let dx = 0,
    dy = 0;

  switch (direction) {
    case "up":
      dx = 0;
      dy = -speed;
      break;
    case "down":
      dx = 0;
      dy = speed;
      break;
    case "left":
      dx = -speed;
      dy = 0;
      break;
    case "right":
      dx = speed;
      dy = 0;
      break;
  }

  movingInterval = setInterval(() => {
    const newX = cPlayer.x + dx;
    const newY = cPlayer.y + dy;

    if (
      newX < 0 ||
      newX + cPlayer.size > canvas.width ||
      newY < 0 ||
      newY + cPlayer.size > canvas.height ||
      isCollision(newX, newY, cPlayer)
    ) {
      clearInterval(movingInterval); // Stop movement on collision
      movingInterval = null; // Reset interval reference
      cPlayer.x = Math.round(cPlayer.x / speed) * speed; // Align position to grid
      cPlayer.y = Math.round(cPlayer.y / speed) * speed;
      isMoving = false; // Unlock movement

      soundEffect.currentTime = 0; // Reset sound playback
      soundEffect.play(); // Play sound effect

      drawPlayer(cPlayer);
      processAdvancedNextMove(queue, cPlayer); // Process the next move in the queue
    } else {
      // Update player position
      cPlayer.x = newX;
      cPlayer.y = newY;
      drawPlayer(cPlayer);
    }
  }, 10);
}

function executeAdvancedMoves(moveQueue) {
  if (isExecutingMoves || moveQueue.length === 0) return; // Prevent overlap
  isExecutingMoves = true;

  const interval = setInterval(() => {
    if (moveQueue.length === 0 || isMoving) {
      clearInterval(interval); // Stop when all moves are processed or already moving
      isExecutingMoves = false; // Reset flag
      return;
    }
    const cPlayer = { ...player };

    startAdvancedMoving(moveQueue[0], cPlayer, moveQueue); // Start moving
  }, 300); // Delay between moves
}

function disableHintButton() {
  hintButton.disabled = true;
  hintButton.textContent = "Hint Used";
  //hintButton.style.left = "-143px";
}

function enableHintButton() {
  hintButton.disabled = false;
  hintButton.textContent = "Hint";
  //hintButton.style.left = "-103px";
}

hintButton.addEventListener("click", () => {
  if (hintUsed[currentLevel]) {
    alert("No hints left!");
  } else {
    showHintConfirmation();
  }
});

function highlightNextSteps(nextMoves) {
  // Map directions to their respective buttons
  const buttonMap = {
    up: document.querySelector('button[data-direction="ArrowUp"]'),
    down: document.querySelector('button[data-direction="ArrowDown"]'),
    left: document.querySelector('button[data-direction="ArrowLeft"]'),
    right: document.querySelector('button[data-direction="ArrowRight"]'),
  };

  // Highlight each of the next two steps
  nextMoves.forEach((move, index) => {
    const button = buttonMap[move];
    if (!button) return;

    // Add blinking effect with a CSS class
    setTimeout(() => {
      button.classList.add("blink-highlight");

      // Remove the class after blinking
      setTimeout(() => {
        button.classList.remove("blink-highlight");
      }, 1500); // Blink duration (adjust as needed)
    }, index * 1600); // Delay for each move's highlight
  });
}

function updateDirectionsToTracker(stopIndex) {
  // Get all the child <li> elements
  let listItems = trackerList.querySelectorAll("li");

  // Remove elements after the last correct move index
  for (let i = listItems.length - 1; i > stopIndex; i--) {
    trackerList.removeChild(trackerList.firstChild);
  }
}

function movePlayerToCorrectStep(stepIndex) {
  const lastCorrect = playerLastPositions[stepIndex - 1];

  // move player to last correct position
  player.x = lastCorrect?.x || player.startX;
  player.y = lastCorrect?.y || player.startY;

  drawPlayer();

  updateDirectionsToTracker(stepIndex - 1);

  // remove incorrect values
  playerLastPositions = playerLastPositions.slice(0, stepIndex);
  playerSteps = playerSteps.slice(0, stepIndex);
}

document.addEventListener("DOMContentLoaded", () => {
  menuButton.style.display = "none";
});

// Function to show the options window
function showOptionsWindow() {
  optionsWindow.style.display = "block";
}

// Function to hide the options window
function hideOptionsWindow() {
  optionsWindow.style.display = "none";
}

// Event listeners for opening and closing the options window
optionsButton.addEventListener("click", showOptionsWindow);
closeOptionsButton.addEventListener("click", hideOptionsWindow);

function playErrorSound() {
  const errorSound = new Audio("./assets/audio/error.wav");
  errorSound.play().catch((err) => {
    console.error("Error playing sound:", err);
  });
}

function showErrorPopup() {
  const errorPopup = document.getElementById("errorPopup");
  errorPopup.style.display = "block";

  // Hide the popup after 2 seconds
  setTimeout(() => {
    errorPopup.style.display = "none";
  }, 1000);
}

function showLevelAnnouncement(level, baseColor = "#999999", highlightColor = "#CCCCCC") {
  const root = document.documentElement;
  const levelAnnouncement = document.getElementById("levelAnnouncement");
  const levelText = document.getElementById("levelText");

  // Apply the background color
  const backgroundColor = getComputedStyle(root)
    .getPropertyValue("--background-color")
    .trim();
  levelAnnouncement.style.backgroundColor = backgroundColor;

  // Set the level text content and split into letters
  levelText.innerHTML = ""; // Clear any previous content
  const levelTextContent = `LEVEL ${level}`;
  const totalDuration = 2000; // Total display duration (2 seconds)
  const highlightDuration = 100; // Duration for each letter's highlight
  const delayBeforeHighlight = 300; // Delay before the highlighting starts

  // Calculate the interval between highlights so all fit within the total duration
  const highlightSequenceDuration = totalDuration - delayBeforeHighlight;
  const interval = Math.min(
    (highlightSequenceDuration - highlightDuration) / Math.max(levelTextContent.length - 1, 1),
    highlightDuration
  );

  [...levelTextContent].forEach((char, index) => {
    const span = document.createElement("span");
    span.textContent = char;
    span.style.color = baseColor; // Set base color
    span.style.display = "inline-block"; // Ensure proper spacing
    levelText.appendChild(span);

    // Add a highlight effect to each letter with a delay
    setTimeout(() => {
      span.style.color = highlightColor; // Highlight the letter
      setTimeout(() => {
        span.style.color = baseColor; // Revert to base color
      }, highlightDuration); // Highlight duration
    }, delayBeforeHighlight + index * interval); // Start highlighting after the delay
  });

  // Show the announcement container
  levelAnnouncement.style.display = "flex";

  // Clear any existing timeout to prevent overlapping
  if (levelAnnouncementTimeout) {
    clearTimeout(levelAnnouncementTimeout);
  }

  // Set a new timeout for hiding the announcement
  levelAnnouncementTimeout = setTimeout(() => {
    levelAnnouncement.style.display = "none";
    levelAnnouncementTimeout = null; // Reset timeout ID
  }, totalDuration); // Display time = total animation time
}

function startGame(mazeImageSrc, exitPosition, playerPosition) {

  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  // Clear existing checkpoints and level-specific intervals
  clearCheckpoints();
  clearLevel7Blocks(); // Clear the block movement interval if it exists

  console.log("Current Level:", currentLevel);
  console.log("Gaps:", gaps);
  
  gaps.length = 0;

  mazeImage.src = mazeImageSrc;

  // Wait for the maze image to load before continuing
  mazeImage.onload = () => {
    console.log(`Maze image loaded: ${mazeImageSrc}`);

    // Extract the maze data
    extractMazeData();
    // Update the player and exit positions
    exit.x = exitPosition.x;
    exit.y = exitPosition.y;
    player.startX = playerPosition.x;
    player.startY = playerPosition.y;

    // Level-specific initialization
    if (currentLevel === 6) {
      // Initialize gaps for Level 6
      gaps.push({
        level: 6,
        x: 391, // Adjust to your gap's coordinates
        y: 271,
        width: 31,
        height: 20,
        color: "transparent"
      });
      gaps.push({
        level: 6,
        x: 411, // Adjust to your gap's coordinates
        y: 271,
        width: 11,
        height: 20,
      });
      console.log("Gaps initialized for level 6:", gaps);

      // Render maze with gaps
      renderMazeWithGaps(ctx, gaps);
    } else if (currentLevel === 7) {
      initializeLevel7Blocks(); // Initialize the moving block for level 7
    } else if (currentLevel === 8) {
      initializeCheckpoints(); // Ensure the checkpoint is valid
      console.log("Checkpoint initialized for level 8:", checkpoints);
    }

    // Log all checkpoints
    checkpoints.forEach((checkpoint, index) => {
      console.log(`Checkpoint ${index + 1}:`, checkpoint);
    });

    // Redraw the player and checkpoint
    recolorMaze();
    drawCheckpoints();
    
    if (currentLevel === 6) {
      
      console.log(`Rendering maze for level ${currentLevel}`);
      renderMazeWithGaps(ctx, gaps); 
    }
    
    if (currentLevel === 7) drawLevel7Blocks(ctx);
    drawPlayer();
  };
  // Change body background color based on the level
  updateBodyBackgroundColor();
  // Update controls button colors based on the level
  updateControlsButtonColors();
  levelSelection.style.display = "none";
  // Show the level announcement
  showLevelAnnouncement(currentLevel);
  const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  applyGameColors(isEquipped); // Call the function to apply colors
  // Show the game container
  gameContainer.style.display = "block";

  // Show the Menu button since we're in a level
  menuButton.style.display = "block";

  // Show the Hint button when in a level
  hintButton.style.display = "block";

  // Set the maze image and initialize the level
  
  //mazeImage.src = mazeImageSrc;

  // Update the exit position
  exit.x = exitPosition.x;
  exit.y = exitPosition.y;

  player.startX = playerPosition.x;
  player.startY = playerPosition.y;

  // Reset the game for the selected level
  restartGame();

  // Update the canvas border to match the current level
  updateCanvasBorder();

  // Update the maze container color
  updateMazeContainerColor();

  // Update the tracker container style for the current level
  updateTrackerContainerStyle();

  // Ensure correct visibility of the "Next Level" button
  const nextLevelButton = document.getElementById("nextLevelButton");
  nextLevelButton.style.display = currentLevel < 9 ? "block" : "none";
}
let level7Blocks = []; // Array to hold multiple blocks
const defLevel7Blocks = [
  { x: 20, y: 140, width: 120, height: 20, speed: 2, startX: 20, endX: 40, startY: 140, endY: 140 },
  { x: 20, y: 160, width: 20, height: 20, speed: 2, startX: 20, endX: 40, startY: 160, endY: 160 },
  { x: 20, y: 180, width: 60, height: 20, speed: 2, startX: 20, endX: 40, startY: 180, endY: 180 },
  { x: 20, y: 200, width: 20, height: 60, speed: 2, startX: 20, endX: 40, startY: 200, endY: 200 },
];
let level7RunId = 0; // Track current run ID to stop stale movements
let stopLevel7Blocks = false; // Flag to stop the loop
let currentMoveLevel7BlocksMode = true;

function initializeLevel7Blocks() {
  if (currentLevel !== 7) return;
  console.log("Initializing Level 7 blocks...");

  // Define initial positions and parameters
  level7Blocks = [...defLevel7Blocks];

  stopLevel7Blocks = false;
  level7RunId++; // Increment run ID to invalidate previous movements

  // Start the movement loop after a delay
  moveLevel7BlocksWithDelay();
}

async function moveLevel7BlocksWithDelay() {
  if (!level7Blocks.length || stopLevel7Blocks) return;

  const currentRunId = level7RunId; // Capture current run ID

  await smoothMoveBlocks(currentMoveLevel7BlocksMode);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (stopLevel7Blocks || currentRunId !== level7RunId) return;
  currentMoveLevel7BlocksMode = !currentMoveLevel7BlocksMode;
  // calls itself
  moveLevel7BlocksWithDelay();
}

async function smoothMoveBlocks(isMovingToStart) {
  const steps = 60; // Number of steps for smooth movement (~60 FPS)
  const stepDuration = 500 / steps; // Duration of each step

  for (let i = 0; i < steps; i++) { 
    if (stopLevel7Blocks) return; // Exit immediately if movement stops

    level7Blocks.forEach((block) => {
      // Determine the target position dynamically
      const targetX = isMovingToStart ? block.startX : block.endX;
      const targetY = isMovingToStart ? block.startY : block.endY;

      const remainingDistanceX = targetX - block.x;
      const remainingDistanceY = targetY - block.y;

      // Smoothly distribute the remaining distance
      const distanceX = remainingDistanceX / (steps - i);
      const distanceY = remainingDistanceY / (steps - i);

      // Update block position
      block.x += distanceX;
      block.y += distanceY;

      // Check for collision with player
      if (isCollidingWithPlayer(block, player)) {
        // Calculate new player position if pushed by block
        const newPlayerX = player.x + distanceX;
        const newPlayerY = player.y + distanceY;

        // Check if this push would result in a wall collision
        if (isCollision(newPlayerX, newPlayerY, player)) {
          // Only kill if we're actually moving (not at start/end positions)
          const atStartPos = Math.abs(block.x - block.startX) < 0.1 && Math.abs(block.y - block.startY) < 0.1;
          const atEndPos = Math.abs(block.x - block.endX) < 0.1 && Math.abs(block.y - block.endY) < 0.1;
          if (!atStartPos && !atEndPos) {
            console.log("Block pushed player into wall - DEATH!");
            handlePlayerDeath();
            stopLevel7Blocks = true;
            return;
          }
        } else {
          // If no wall collision, move with the block
          player.x = newPlayerX;
          player.y = newPlayerY;
        }
      }
    });

    // Redraw everything
    recolorMaze();
    drawLevel7Blocks(ctx);
    ctx.drawImage(trailCanvas, 0, 0);
    drawPlayer();

    await new Promise((resolve) => setTimeout(resolve, stepDuration));
  }

  if (stopLevel7Blocks) return;

  // Snap blocks to their target positions
  level7Blocks.forEach((block) => {
    block.x = isMovingToStart ? block.startX : block.endX;
    block.y = isMovingToStart ? block.startY : block.endY;
  });
}

function isCollidingWithPlayer(block, player) {
  return (
      player.x < block.x + block.width &&
      player.x + player.size > block.x &&
      player.y < block.y + block.height &&
      player.y + player.size > block.y
  );
}

function drawLevel7Blocks(ctx) {
  if (!level7Blocks.length || currentLevel !== 7) return;

  ctx.fillStyle = "#222222";
  level7Blocks.forEach((block) => {
    ctx.fillRect(block.x, block.y, block.width, block.height);
  });
}

function clearLevel7Blocks() {
  console.log("Clearing Level 7 blocks...");

  // Stop all block movement and reset state
  stopLevel7Blocks = true;
  level7RunId++; // Increment runId to cancel ongoing loops

  // Clear all active timers and intervals
  clearAllTimers();

  // Reset block positions
  level7Blocks.forEach((block) => {
    block.x = block.startX;
    block.y = block.startY;
  });
}

function checkLevel7BlocksCollision(player) {
  if (!level7Blocks.length || currentLevel !== 7) return;

  level7Blocks.forEach((block) => {
    // Check if player is colliding with the block
    const collision =
      player.x < block.x + block.width &&
      player.x + player.size > block.x &&
      player.y < block.y + block.height &&
      player.y + player.size > block.y;

    if (collision) {
      // Check if block is actually moving (not at either start or end position)
      const atStartPos = Math.abs(block.x - block.startX) < 0.1 && Math.abs(block.y - block.startY) < 0.1;
      const atEndPos = Math.abs(block.x - block.endX) < 0.1 && Math.abs(block.y - block.endY) < 0.1;
      const isBlockMoving = !atStartPos && !atEndPos;
      
      if (isBlockMoving) {
        console.log("Player collided with moving block!");
        
        // Calculate the direction and distance of push
        const dx = block.x - block.startX;
        const dy = block.y - block.startY;
        
        // Calculate new player position after push
        const newPlayerX = player.x + dx;
        const newPlayerY = player.y + dy;
        
        // Check if the new position would cause a wall collision
        if (isCollision(newPlayerX, newPlayerY, player)) {
          console.log("Player would be pushed into a wall - DEATH!");
          handlePlayerDeath();
          return;
        }
        
        // If no wall collision, push the player
        player.x = newPlayerX;
        player.y = newPlayerY;
        drawPlayer();
      }
    }
  });
}
function pushPlayerWithBlock(player, block, dx, dy) {
  // Push the player by the same distance as the block
  player.x += dx;
  player.y += dy;

  console.log(`Pushing player by dx=${dx}, dy=${dy}`);
  drawPlayer(); // Redraw the player in the new position
}
// Function to show the death screen
function showDeathScreen() {
  // Create the modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.id = "deathScreenOverlay";
  modalOverlay.style.position = "fixed";
  modalOverlay.style.top = "0";
  modalOverlay.style.left = "0";
  modalOverlay.style.width = "100%";
  modalOverlay.style.height = "100%";
  modalOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  modalOverlay.style.display = "flex";
  modalOverlay.style.justifyContent = "center";
  modalOverlay.style.alignItems = "center";
  modalOverlay.style.zIndex = "1000";

  // Create the modal content
  const modalContent = document.createElement("div");
  modalContent.style.backgroundColor = "#222";
  modalContent.style.borderRadius = "0px";
  modalContent.style.padding = "30px";
  modalContent.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  modalContent.style.textAlign = "center";
  modalContent.style.color = "#fff";
  modalContent.style.maxWidth = "400px";
  modalContent.style.width = "80%";

  // Add death message
  const deathMessage = document.createElement("h2");
  deathMessage.textContent = "You Lost!";
  deathMessage.style.marginBottom = "20px";
  deathMessage.style.fontSize = "2rem";
  deathMessage.style.color = "#FF6A99"; // Accent color
  modalContent.appendChild(deathMessage);

  // Add Restart Button
  const restartButton = document.createElement("button");
  restartButton.style.fontFamily = "CustomFont";
  restartButton.textContent = "Restart";
  restartButton.style.margin = "10px";
  restartButton.style.padding = "10px 20px";
  restartButton.style.fontSize = "1rem";
  restartButton.style.backgroundColor = "#8A314E";
  restartButton.style.color = "#fff";
  restartButton.style.border = "none";
  restartButton.style.borderRadius = "0px";
  restartButton.style.cursor = "pointer";
  restartButton.addEventListener("click", () => {
    document.body.removeChild(modalOverlay); // Close the modal
    stopLevel7Blocks = true; // Stop any moving blocks
    clearLevel7Blocks(); // Reset block positions
    restartGame(); // Restart the current level
  });
  modalContent.appendChild(restartButton);

  // Add Main Menu Button
  const menuButton = document.createElement("button");
  menuButton.style.fontFamily = "CustomFont";
  menuButton.textContent = "Main Menu";
  menuButton.style.margin = "10px";
  menuButton.style.padding = "10px 20px";
  menuButton.style.fontSize = "1rem";
  menuButton.style.backgroundColor = "#222";
  menuButton.style.color = "#FF6A99"; // Accent color
  menuButton.style.border = "2px solid #8A314E";
  menuButton.style.borderRadius = "0px";
  menuButton.style.cursor = "pointer";
  menuButton.addEventListener("click", () => {
    document.body.removeChild(modalOverlay); // Close the modal
    stopLevel7Blocks = true; // Stop any moving blocks
    clearLevel7Blocks(); // Reset block positions
    showLevelSelector(); // Return to level selection screen
  });
  modalContent.appendChild(menuButton);

  // Add hover effects
  restartButton.addEventListener("mouseover", () => {
    restartButton.style.backgroundColor = "#FF6A99";
  });
  restartButton.addEventListener("mouseout", () => {
    restartButton.style.backgroundColor = "#8A314E";
  });

  menuButton.addEventListener("mouseover", () => {
    menuButton.style.backgroundColor = "#8A314E";
    menuButton.style.color = "#fff";
  });
  menuButton.addEventListener("mouseout", () => {
    menuButton.style.backgroundColor = "#222";
    menuButton.style.color = "#FF6A99";
  });

  // Append modal content to overlay
  modalOverlay.appendChild(modalContent);

  // Append overlay to the body
  document.body.appendChild(modalOverlay);
}

function handlePlayerDeath() {
  console.log("Player has died."); // Log for debugging purposes
  // Unlock "The Tail" achievement upon death
  achievementProgress.theTail.progress = 100;
  achievementProgress.theTail.status = "Unlocked";
  // Save progress and update UI
  saveAchievementProgress();
  updateAchievementUIAnimated();

  // Show the death screen
  showDeathScreen();
}
function clearCheckpoints() {
  // Clear the checkpoints array
  checkpoints = [];

  // Clear the canvas area where checkpoints are drawn
  const ctx = mazeCanvas.getContext("2d");
  ctx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);

  console.log("Checkpoints cleared.");
}

function updateControlsButtonColors() {
  // Retrieve CSS variables for styling
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue("--button-color")
    .trim();
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-color")
    .trim();
  const border = `2px solid ${getComputedStyle(document.documentElement)
    .getPropertyValue("--border-color")
    .trim()}`;

  // Select all .controls buttons
  const controlsButtons = document.querySelectorAll(".controls button");

  // Apply styles to each button
  controlsButtons.forEach((button) => {
    button.style.backgroundColor = background;
    button.style.color = color;
    button.style.border = border;
  });
}

function updateTrackerContainerStyle() {
  const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  const trackerContainer = document.querySelector(".tracker-container");

  // Define colors based on equip state
  const normalEntryColor = isEquipped ? "#FF6A99" : "#999999";
  const highlightEntryColor = isEquipped ? "#FFADC7" : "#CCCCCC";
  const backgroundColor = isEquipped ? "#8A314E" : "#222222";
  const textColor = isEquipped ? "#FF6A99" : "#CCCCCC";
  const borderColor = isEquipped ? "#FF6A99" : "#999999";
  const highlightBgColor = isEquipped ? "#FFADC7" : "#CCCCCC";
  // Apply the styles
  trackerContainer.style.backgroundColor = backgroundColor;
  trackerContainer.style.color = textColor;
  trackerContainer.style.border = `2px solid ${borderColor}`;

  trackerContainer.style.setProperty("--normal-entry-color", normalEntryColor);
  trackerContainer.style.setProperty("--highlight-entry-color", highlightEntryColor);

  trackerContainer.style.setProperty("--highlight-bg-color", highlightBgColor);
}

function updateBodyBackgroundColor() {
  const body = document.body;
  // Use the default background color defined in a CSS variable
  body.style.backgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--background-color")
    .trim();
}

function updateMazeContainerColor() {
  const mazeContainer = document.querySelector(".maze-container");
  const containerColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--maze-color")
    .trim();
  mazeContainer.style.backgroundColor = containerColor;
}

function startCentralSpotEffect() {
  const mazeContainer = document.querySelector(".maze-container");
  const pseudoElement = mazeContainer.style;

  function applyCentralSpotAnimation() {
    const spotSize = Math.random() * 100 + 150; // Random size between 150px and 250px
    const blurRadius = Math.random() * 30 + 10; // Random blur between 10px and 40px

    // Update the pseudo-element's styles dynamically
    pseudoElement.setProperty('--spot-width', `${spotSize}px`);
    pseudoElement.setProperty('--spot-height', `${spotSize}px`);
    pseudoElement.setProperty('--spot-blur', `${blurRadius}px`);

    // Repeat with a random delay between 100ms and 400ms
    setTimeout(applyCentralSpotAnimation, Math.random() * 300 + 100);
  }

  applyCentralSpotAnimation();
}

function startFlickeringEffect() {
  const mazeContainer = document.querySelector(".maze-container");

  function applyRandomShadow() {
    const blurRadius = Math.random() * 50 + 20; // Random blur radius between 20px and 70px
    const spreadRadius = Math.random() * 10 - 5; // Random spread radius between -5px and 5px
    const opacity = Math.random() * 0.7 + 0.3; // Random opacity between 0.3 and 1

    // Update the dynamic shadow for the ::after pseudo-element
    mazeContainer.style.setProperty(
      "--dynamic-shadow",
      `inset 0 0 ${blurRadius}px ${spreadRadius}px rgba(0, 0, 0, ${opacity})`
    );

    // Repeat with a random delay between 100ms and 400ms
    setTimeout(applyRandomShadow, Math.random() * 300 + 100);
  }

  applyRandomShadow();
}

document.addEventListener("DOMContentLoaded", () => {
  startFlickeringEffect();
  startCentralSpotEffect();
});


function updateCanvasBorder() {
  const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  const mazeBorderColor = isEquipped ? "#8A314E" : "#222222"; // Choose color based on equip state
  document.querySelector("canvas").style.border = `1px solid ${mazeBorderColor}`;
}

function goToNextLevel() {
  if (currentLevel === stupidLevels.length) {
    console.log("No more levels available!");
    const nextLevelButton = document.getElementById("nextLevelButton");
    if (nextLevelButton) {
      nextLevelButton.style.display = "none"; // Hide the button when no more levels are available
    }
  } else {
    preStartGame(currentLevel + 1);
  }
}

function checkWin(bypass = false) {
  if (
      (player.x < exit.x + exit.size &&
          player.x + player.size > exit.x &&
          player.y < exit.y + exit.size &&
          player.y + player.size > exit.y) ||
      bypass
  ) {
      clearInterval(timerInterval);

      const elapsedTime = document
          .getElementById("timerDisplay")
          .textContent.split(": ")[1];
      levelCompletionTimes[`level${currentLevel}`] = elapsedTime;

      saveLevelCompletionTime(`level${currentLevel}`, elapsedTime);
      updateLevelCompletionTime();

      if (currentLevel === 8) {
          // Check Level 8 progress and unlock achievement
          const progressFill = document.querySelector(".progressFill");
          const progressPercentage = document.querySelector(".progressPercentage");

          let progress = 0;
          if (checkpointsTouched.first) progress += 50;
          if (checkpointsTouched.second) progress += 50;

          progressFill.style.width = `${progress}%`;
          progressPercentage.textContent = `${progress}%`;

          if (progress === 100) {
              const achievementStatus = document.querySelector(".achievementStatus");
              achievementStatus.innerHTML = `Unlocked<br>Brain Palette`;
              console.log("Achievement unlocked: The Brain");

              achievementProgress.theBrain.status = "Unlocked";
              achievementProgress.theBrain.progress = 100;
              saveAchievementProgress();
          }
      }

      // Display the win popup
      winPopup.style.display = "block";

      moveCountMessage.innerHTML = `You won and it took you ${moveCount} moves.<br>
          your time was ${elapsedTime}.<br>..loser`;

      const nextLevelButton = document.getElementById("nextLevelButton");
      const menuButtonPopup = document.getElementById("menuButtonPopup");

      if (currentLevel < 9) {
          nextLevelButton.style.display = "block";
          menuButtonPopup.style.display = "none";
      } else {
          nextLevelButton.style.display = "none";
          menuButtonPopup.style.display = "block";
      }
      updateLevelCompletionTime();
  }
}
function updateLevelCompletionTime() {
  for (let level in levelCompletionTimes) {
    const button = document.getElementById(`${level}Button`);
    if (button) {
      let timeLabel = document.getElementById(`${level}Timer`);
      // Update the time label content
      const time = levelCompletionTimes[level];
      timeLabel.textContent = `Time: ${time}`;
      timeLabel.style.display = "block";
      // Ensure the time is saved to localStorage
      saveLevelCompletionTime(level, time);
    }
  }
}

const stupidLevels = [
  { src: "level1.png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
  { src: "level2(4).png", s: { x: 180, y: 40 }, f: { x: 180, y: 380 } },
  { src: "level3(3).png", s: { x: 180, y: 0 }, f: { x: 180, y: 340 } },
  { src: "level4(1).png", s: { x: 180, y: 0 }, f: { x: 180, y: 320 } },
  { src: "level5(2).png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
  { src: "level6(3).png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
  { src: "level7test1.png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
  { src: "level8(1).png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
  { src: "level9.png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
];

const timerColors = {
  1: "#999999",
  2: "#999999",
  3: "#999999",
  4: "#999999",
  5: "#999999",
  6: "#999999",
  7: "#999999",
  8: "#999999",
  9: "#999999",
};

function preStartGame(level) {
  currentLevel = level; // Set current level
  showLevelAnnouncement(level);

  const getStupidLevel = stupidLevels[level - 1];

  document.getElementById("timerDisplay").textContent = "time: 00:00";
  startTimer();

  const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  timerDisplay.style.color = isEquipped ? "#FF6A99" : (timerColors[level] || "#CCCCCC"); // Use equipped color or default
  startGame(getStupidLevel.src, getStupidLevel.s, getStupidLevel.f);
}

function showLevelSelector() {
  // Reset body background color to the default menu color
  document.body.style.backgroundColor = "#222222";
  // Hide the level announcement immediately
  levelAnnouncement.style.display = "none";
  if (levelAnnouncementTimeout) {
    clearTimeout(levelAnnouncementTimeout);
    levelAnnouncementTimeout = null;
  }
  resetHints();
  enableHintButton();

  document.getElementById("levelSelection").style.display = "flex";
  document.getElementById("gameContainer").style.display = "none";
  menuButton.style.display = "none"; // Hide the Menu button
  hintButton.style.display = "none"; // Hide the Hint button when in menu

  const tipText = document.getElementById("levelSelectionTip");
  if (tipText) {
    tipText.style.display = "block";
  }
  gaps.length = 0; // Reset gaps to an empty array
  currentLevel = null; // Ensure no lingering currentLevel
  console.log("Gaps cleared when entering the level selector.");
}

let lastDirection = null; // Store the last completed move direction
let isExecutingMoves = false; // Flag to indicate automated execution
let isMoving = false; // Lock to prevent overlapping movements

// Add event listener for the Confirm button
const confirmButton = document.getElementById("confirmButton");
confirmButton.addEventListener("click", executeMoves);

const moveQueue = []; // Queue to store moves

const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400; // Larger internal width for rendering
canvas.height = 400; // Larger internal height for rendering

// Use CSS to restrict the visible size of the canvas
canvas.style.width = "400px"; // Visible width
canvas.style.height = "400px"; // Visible height

const resetButton = document.getElementById("resetButton");
const trackerList = document.getElementById("trackerList");
const winPopup = document.getElementById("winPopup");
const moveCountMessage = document.getElementById("moveCountMessage");

const mazeImage = new Image();
mazeImage.src = "level1.png";

inGameResetButton.addEventListener("click", restartGame);

const scale = 2;
const player = {
  x: 180,
  y: 380,
  size: 20,
  startX: 180,
  startY: 380,
  color: "#d1406e", // Add a color property
  
};

const exit = {
  x: 180,
  y: 0,
  size: 20,
};

let mazeData;
let movingInterval = null;
let currentDirection = null;
let nextDirection = null;
let moveCount = 0;

mazeImage.onload = () => {
  ctx.imageSmoothingEnabled = false;
  recolorMaze();
  extractMazeData();
  drawPlayer();
  drawExit();
};

function processNextMove() {
  if (isMoving || moveQueue.length === 0) return; // Prevent overlapping moves

  const direction = moveQueue.shift(); // Get the next move in the queue
  currentDirection = direction; // Set the current direction

  startMoving(); // Start moving the player

  checkCheckpointCollision(); // Check checkpoint

  // Update lastDirection after starting the move
  lastDirection = direction;
}

function recolorMaze() {

  const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";

  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = mazeImage.width;
  offscreenCanvas.height = mazeImage.height;
  const offscreenCtx = offscreenCanvas.getContext("2d");
  offscreenCtx.drawImage(mazeImage, 0, 0);

  const imageData = offscreenCtx.getImageData(
    0,
    0,
    mazeImage.width,
    mazeImage.height
  );
  const data = imageData.data;

  // Use a single color for all levels
  const newColor = isEquipped ? { r: 138, g: 49, b: 78 } : { r: 34, g: 34, b: 34 };

  for (let i = 0; i < data.length; i += 4) {
    // If the pixel is black and non-transparent
    if (
      data[i] === 0 &&
      data[i + 1] === 0 &&
      data[i + 2] === 0 &&
      data[i + 3] !== 0
    ) {
      data[i] = newColor.r;
      data[i + 1] = newColor.g;
      data[i + 2] = newColor.b;
    }
  }

  offscreenCtx.putImageData(imageData, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.drawImage(offscreenCanvas, 0, 0);
  ctx.restore();
}

function extractMazeData() {
  const scaledWidth = canvas.width / scale;
  const scaledHeight = canvas.height / scale;

  // Create an offscreen canvas for processing
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = scaledWidth;
  offscreenCanvas.height = scaledHeight;
  const offscreenCtx = offscreenCanvas.getContext("2d");

  // Draw the current maze image onto the offscreen canvas
  offscreenCtx.drawImage(mazeImage, 0, 0, scaledWidth, scaledHeight);

  // Extract image data for collision detection
  const imageData = offscreenCtx.getImageData(0, 0, scaledWidth, scaledHeight);
  mazeData = imageData.data;

  console.log("Maze data extracted for:", mazeImage.src);
  console.log("Maze dimensions:", scaledWidth, scaledHeight);
  console.log("Sample maze data (first 10 bytes):", mazeData.slice(0, 10));
}

const trailCanvas = document.createElement("canvas");
trailCanvas.width = canvas.width;
trailCanvas.height = canvas.height;
const trailCtx = trailCanvas.getContext("2d");

// Add these variables at the top level with other declarations
let trailBlocks = []; // Store trail block positions
let isTrailAnimating = false;
let trailTimeout = null;

function drawPlayer(cPlayer) {
  const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";

  // Draw everything except trail blocks first
  recolorMaze();
  drawExit();
  drawCheckpoints();
  if (currentLevel === 7) {
    drawLevel7Blocks(ctx);
  }
  if (currentLevel === 6) {
    renderMazeWithGaps(ctx, gaps);
  }

  if (cPlayer) {
    ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
    ctx.fillRect(cPlayer.x, cPlayer.y, cPlayer.size, cPlayer.size);
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Draw trail blocks last so they're on top
  if (isTailEquipped && !isTrailAnimating) {
    trailCtx.fillStyle = player.color;
    trailCtx.fillRect(player.x, player.y, player.size, player.size);
    ctx.drawImage(trailCanvas, 0, 0);
  }
}

function animateTrailMerge() {
  if (!trailBlocks.length) return;
  
  isTrailAnimating = true;
  
  // Get counter position
  const counterBox = document.querySelector('.counter-box');
  const counterRect = counterBox.getBoundingClientRect();
  const mazeContainer = document.querySelector('.maze-container');
  const mazeRect = mazeContainer.getBoundingClientRect();
  const canvas = document.getElementById('mazeCanvas');
  const canvasRect = canvas.getBoundingClientRect();
  
  // Calculate target position relative to viewport
  const targetX = counterRect.left + counterRect.width/2 - player.size/2;
  const targetY = counterRect.top + counterRect.height/2 - player.size/2;
  
  // Store current counter value
  const restartCounter = document.getElementById('restartCounter');
  const currentCount = parseInt(restartCounter.textContent || '0');
  const totalBlocks = trailBlocks.length;
  
  // Create absolute positioned divs for each trail block
  const trailDivs = trailBlocks.map(block => {
    const trailDiv = document.createElement('div');
    trailDiv.className = 'trail-block';
    
    // Calculate initial position relative to viewport, accounting for canvas position
    const initialX = canvasRect.left + block.x * (canvasRect.width / canvas.width);
    const initialY = canvasRect.top + block.y * (canvasRect.height / canvas.height);
    
    trailDiv.style.cssText = `
      position: fixed !important;
      left: ${initialX}px;
      top: ${initialY}px;
      width: ${player.size * (canvasRect.width / canvas.width)}px;
      height: ${player.size * (canvasRect.height / canvas.height)}px;
      background-color: ${player.color};
      transition: all 500ms ease;
      z-index: 999999 !important;
      pointer-events: none;
    `;
    document.body.appendChild(trailDiv);
    return trailDiv;
  });
  
  // Clear canvas trail
  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  
  // Start animation
  requestAnimationFrame(() => {
    trailDivs.forEach(div => {
      div.style.left = `${targetX}px`;
      div.style.top = `${targetY}px`;
    });
  });
  
  // After animation completes
  setTimeout(() => {
    // Remove trail divs
    trailDivs.forEach(div => div.remove());
    
    // Show +X animation
    restartCounter.textContent = `+${totalBlocks}`;
    restartCounter.style.paddingTop = '4px';
    
    // Show final score after delay
    setTimeout(() => {
      restartCounter.textContent = (currentCount + totalBlocks).toString();
      trailBlocks = [];
      isTrailAnimating = false;
    }, 500);
  }, 550);
}

function fadeOutCenteredBlock(x, y, totalPoints) {
  const startTime = Date.now();
  const duration = 300; // Shorter fade duration
  
  function fade() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progress >= 1) {
      // Clean up
      trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
      trailBlocks = [];
      isTrailAnimating = false;
      document.querySelectorAll('.total-points').forEach(label => label.remove());
      
      // Final redraw
      recolorMaze();
      drawExit();
      drawCheckpoints();
      if (currentLevel === 7) drawLevel7Blocks(ctx);
      if (currentLevel === 6) renderMazeWithGaps(ctx, gaps);
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.size, player.size);
      return;
    }
    
    // Simple fade out
    const opacity = 1 - progress;
    
    // Draw fading block
    trailCtx.fillStyle = `${player.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    trailCtx.fillRect(x, y, player.size, player.size);
    
    // Update total points label opacity
    const totalLabel = document.querySelector('.total-points');
    if (totalLabel) {
      totalLabel.style.opacity = opacity;
    }
    
    // Redraw everything
    recolorMaze();
    ctx.drawImage(trailCanvas, 0, 0);
    drawExit();
    drawCheckpoints();
    if (currentLevel === 7) drawLevel7Blocks(ctx);
    if (currentLevel === 6) renderMazeWithGaps(ctx, gaps);
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.size, player.size);
    
    requestAnimationFrame(fade);
  }
  
  fade();
}

// Modify the startMoving function to handle trail animation
function startMoving(onMoveComplete) {
  if (isMoving) return;
  
  // Clear any existing trail animation timeout
  if (trailTimeout) {
    clearTimeout(trailTimeout);
    trailTimeout = null;
  }

  isMoving = true;
  const speed = 2;
  const blockSize = 20; // Fixed block size
  let dx = 0, dy = 0;
  
  switch (currentDirection) {
    case "ArrowUp": dy = -speed; break;
    case "ArrowDown": dy = speed; break;
    case "ArrowLeft": dx = -speed; break;
    case "ArrowRight": dx = speed; break;
  }

  const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";
  const startX = player.x;
  const startY = player.y;

  const doTheMove = () => {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (isCollision(newX, newY)) {
      // Snap to grid
      player.x = Math.round(player.x / blockSize) * blockSize;
      player.y = Math.round(player.y / blockSize) * blockSize;
      isMoving = false;

      // Only add trail block if we've moved a full block
      if (isTailEquipped) {
        // Calculate blocks moved by counting 20-pixel increments
        const distanceX = Math.abs(player.x - startX);
        const distanceY = Math.abs(player.y - startY);
        const blocksMovedX = Math.floor(distanceX / blockSize);
        const blocksMovedY = Math.floor(distanceY / blockSize);
        
        // Use the larger distance for diagonal movement
        const blocksMoved = Math.max(blocksMovedX, blocksMovedY);

        if (blocksMoved > 0) {
          // Add intermediate blocks along the path
          for (let i = 1; i <= blocksMoved; i++) {
            const ratio = i / blocksMoved;
            const blockX = startX + Math.round((player.x - startX) * ratio);
            const blockY = startY + Math.round((player.y - startY) * ratio);
            
            trailBlocks.push({ x: blockX, y: blockY });
            console.log("Added trail block at:", { x: blockX, y: blockY });
          trailCtx.fillStyle = player.color;
            trailCtx.fillRect(blockX, blockY, player.size, player.size);
          }
          console.log(`Total blocks moved: ${blocksMoved}`);
        }
      }

      drawPlayer();
      soundEffect.currentTime = 0;
      soundEffect.play();

      checkCheckpointCollision();
      if (currentLevel === 7) checkLevel7BlocksCollision(player);
      checkWin();

      if (onMoveComplete) onMoveComplete();
    } else {
      player.x = newX;
      player.y = newY;

      drawPlayer();
      checkCheckpointCollision();
      if (currentLevel === 7) checkLevel7BlocksCollision(player);
      checkWin();

      requestAnimationFrame(doTheMove);
    }
  };

  requestAnimationFrame(doTheMove);
}

// Modify restartGame to clear trail state
function restartGame() {
  // ... existing restart code ...
  
  trailBlocks = [];
  isTrailAnimating = false;
  if (trailTimeout) {
    clearTimeout(trailTimeout);
    trailTimeout = null;
  }
  
  // ... rest of restart code ...
}

function drawExit() {
  // Retrieve the exit color from the CSS variable
  const exitColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--exit-color")
    .trim();
  ctx.fillStyle = exitColor; // Use the color from the palette
  ctx.fillRect(exit.x, exit.y, exit.size, exit.size);
}

function renderMazeWithGaps(context, gaps = []) {
  // Clear previous gap elements
  const existingGaps = document.querySelectorAll('.maze-gap');
  existingGaps.forEach(gap => gap.remove());

  for (const gap of gaps) {
      if (currentLevel === gap.level) {
          console.log(`Rendering DOM gap at (${gap.x}, ${gap.y}) with dimensions ${gap.width}x${gap.height}`);

          // Create a new div for the gap
          const gapElement = document.createElement('div');
          gapElement.className = 'maze-gap';
          gapElement.style.position = 'absolute';
          gapElement.style.left = `${gap.x}px`;
          gapElement.style.top = `${gap.y}px`;
          gapElement.style.width = `${gap.width}px`;
          gapElement.style.height = `${gap.height}px`;
          gapElement.style.backgroundColor = gap?.color ||'rgb(153, 153, 153)';
          gapElement.style.zIndex = '-2';
          
          gapElement.style.pointerEvents = 'none'; // Prevent interaction

          // Append the gap to the maze-container
          mazeContainer.appendChild(gapElement);
      }
  }
}

const gaps = [
  { level: 6, x: 411, y: 271, width: 11, height: 20, isEntranceGap: true, color: "rgb(153, 153, 153)"} // Secret level trigger gap
];


function isCollision(newX, newY, pPlayer) {
  let cPlayer = player;
  if (pPlayer) {
    cPlayer = pPlayer;
  }

  // Check for collisions with solid checkpoints in level 9
  if (currentLevel === 9 && checkpoints) {
    for (const checkpoint of checkpoints) {
      if (checkpoint.solid && 
          newX < checkpoint.x + checkpoint.size &&
          newX + cPlayer.size > checkpoint.x &&
          newY < checkpoint.y + checkpoint.size &&
          newY + cPlayer.size > checkpoint.y) {
        console.log("Collision with solid checkpoint");
        return true;
      }
    }
  }

  // Check for collisions with level 7 blocks
  if (currentLevel === 7 && level7Blocks) {
    for (const block of level7Blocks) {
      if (newX < block.x + block.width &&
          newX + cPlayer.size > block.x &&
          newY < block.y + block.height &&
          newY + cPlayer.size > block.y) {
        return true; // Just block movement, don't kill
      }
    }
  }

  // Check if in a gap
  const inGap = gaps.length > 0 && gaps.some(
    (gap) =>
      gap.level === currentLevel &&
      newX + cPlayer.size > gap.x &&
      newX < gap.x + gap.width &&
      newY + cPlayer.size > gap.y &&
      newY < gap.y + gap.height
  );

  if (inGap) {
    console.log(`Player is in a gap at (${newX}, ${newY})`);

    if (currentLevel === "6secret" && localStorage.getItem('hasSecretKey') === 'true') {
      // Find the return gap
      const returnGap = gaps.find(gap => gap.isReturnGap);
      if (returnGap && 
          newX + cPlayer.size > returnGap.x &&
          newX < returnGap.x + returnGap.width &&
          newY + cPlayer.size > returnGap.y &&
          newY < returnGap.y + returnGap.height) {
        // Store current movement direction
        const currentMovement = currentDirection;
        
        // If there are trail blocks, animate them before transitioning
        if (trailBlocks.length > 0 && !isTrailAnimating) {
          animateTrailMerge();
          // Wait for animation to complete before transitioning
          setTimeout(() => {
            // Reset move tracking before transition
            isExecutingMoves = false;
            isMoving = false;
            moveQueue.length = 0;
            isTrailAnimating = false;
            trailBlocks = [];
            moveCount = 0;
            playerSteps = [];
            trackerList.innerHTML = '';
            // Clear trail canvas
            trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
            // Return to level 6 and resume movement
            returnToLevelSix();
          }, 600); // Wait for trail merge animation
        } else {
          // No trail to collect, transition immediately and resume movement
          returnToLevelSix();
        }
      }
    } else if (currentLevel === 6) {
      // Check for secret level entrance
      const secretGap = gaps.find(gap => gap.width === 11 && gap.height === 20);
      if (secretGap && 
          newX + cPlayer.size > secretGap.x &&
          newX < secretGap.x + secretGap.width &&
          newY + cPlayer.size > secretGap.y &&
          newY < secretGap.y + secretGap.height) {
        // Store current movement direction
        const currentMovement = currentDirection;
        
        // If there are trail blocks, animate them before transitioning
        if (trailBlocks.length > 0 && !isTrailAnimating) {
          // Animate trail collection
          animateTrailMerge();
          
          // Wait for animation to complete, then transition while preserving movement
          setTimeout(() => {
            // Clear trail canvas but keep movement state
            trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
            trailBlocks = [];
            
            // Transition to secret level with preserved movement
            transitionToSecretLevel(currentMovement);
          }, 600);
        } else {
          // No trail to collect, transition immediately with preserved movement
          transitionToSecretLevel(currentMovement);
        }
      }
    }

    return false; // Allow movement in gaps
  }

  // For secret level, only check wall collisions and ignore canvas boundaries
  if (currentLevel === "6secret") {
  const mazeX = Math.floor(newX / scale);
  const mazeY = Math.floor(newY / scale);

  const corners = [
    { x: mazeX, y: mazeY },
    { x: mazeX + cPlayer.size / scale - 1, y: mazeY },
    { x: mazeX, y: mazeY + cPlayer.size / scale - 1 },
    {
      x: mazeX + cPlayer.size / scale - 1,
      y: mazeY + cPlayer.size / scale - 1,
    },
  ];

  const scaledWidth = canvas.width / scale;

    // Check for wall collisions in secret level
  for (const corner of corners) {
    const index = (corner.y * scaledWidth + corner.x) * 4 + 3;
    if (mazeData[index] !== 0) {
        console.log(`Secret level collision detected at (${corner.x}, ${corner.y})`);
      return true; // Collision with wall
    }
  }
    return false; // No collision in secret level
  }

  // Regular level collision checks
  if (
    newX < 0 ||
    newY < 0 ||
    newX + cPlayer.size > canvas.width ||
    newY + cPlayer.size > canvas.height
  ) {
    console.log(`Out of bounds: (${newX}, ${newY})`);
    return true; // Block movement outside bounds
  }

  return checkStandardCollisions(newX, newY, cPlayer);
}

function checkStandardCollisions(newX, newY, cPlayer) {
  const mazeX = Math.floor(newX / scale);
  const mazeY = Math.floor(newY / scale);

  const corners = [
      { x: mazeX, y: mazeY },
      { x: mazeX + cPlayer.size / scale - 1, y: mazeY },
      { x: mazeX, y: mazeY + cPlayer.size / scale - 1 },
      {
          x: mazeX + cPlayer.size / scale - 1,
          y: mazeY + cPlayer.size / scale - 1,
      },
  ];

  const scaledWidth = canvas.width / scale;

  for (const corner of corners) {
      const index = (corner.y * scaledWidth + corner.x) * 4 + 3;
      if (mazeData[index] !== 0) {
          console.log(
              `Collision detected at (${corner.x}, ${corner.y})`
          );
          return true; // Collision with wall
      }
  }
  return false; // No collision
}

function addDirectionToTracker(direction) {
  moveCount++;
  playerSteps.push(directionMap[direction]);

  // play buttons animation
  const selctedArrowBtn = document.querySelector(
    `button[data-direction="${direction}"]`
  );
  if (selctedArrowBtn) {
    const ogArrow = selctedArrowBtn.querySelector(".arrow");

    // duplicating element
    const arrow = ogArrow.cloneNode(true);
    arrow.id = 'duplicatedArrow' + direction;

    // appending duplicated arrow to og arrow parent node
    ogArrow.parentNode.appendChild(arrow);

    // keep transform when animating
    const computedStyle = window.getComputedStyle(arrow);
    const currentTransform = computedStyle.transform;

    // Apply animation while preserving rotation
    arrow.style.transform = currentTransform; // Reset rotation before animation
    arrow.classList.add("animate");

    // Remove the animation class after it finishes
    arrow.addEventListener(
      "animationend",
      () => {
        arrow.classList.remove("animate");
        arrow.style.transform = currentTransform;
        arrow.remove();
      },
      { once: true }
    );
  }

  // Create a new list item
  const listItem = document.createElement("li");
  listItem.textContent = `${moveCount}. ${directionMap[direction]}`;

  // Add a class to highlight the new entry
  listItem.classList.add("highlight-entry");

  // Remove the highlight class from the previous last item
  const previousLastItem = trackerList.querySelector(".highlight-entry");
  if (previousLastItem) {
    previousLastItem.classList.remove("highlight-entry");
  }

  // Prepend the new item to the tracker list
  trackerList.prepend(listItem);

  // Add the tracker container highlight effect (optional)
  const trackerContainer = document.querySelector(".tracker-container");
  trackerContainer.classList.add("highlight");
  setTimeout(() => {
    trackerContainer.classList.remove("highlight");
  }, 100); // Duration of the fade-out effect
}

function startMoving(onMoveComplete) {
  if (isMoving) return;

  isMoving = true;
  const speed = 2;
  const blockSize = 20; // Fixed block size
  let dx = 0, dy = 0;

  switch (currentDirection) {
    case "ArrowUp": dy = -speed; break;
    case "ArrowDown": dy = speed; break;
    case "ArrowLeft": dx = -speed; break;
    case "ArrowRight": dx = speed; break;
  }

  const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";
  const startX = player.x;
  const startY = player.y;

  const doTheMove = () => {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (isCollision(newX, newY)) {
      // Snap to grid
      player.x = Math.round(player.x / blockSize) * blockSize;
      player.y = Math.round(player.y / blockSize) * blockSize;
      isMoving = false;

      // Only add trail block if we've moved a full block
      if (isTailEquipped) {
        // Calculate blocks moved by counting 20-pixel increments
        const distanceX = Math.abs(player.x - startX);
        const distanceY = Math.abs(player.y - startY);
        const blocksMovedX = Math.floor(distanceX / blockSize);
        const blocksMovedY = Math.floor(distanceY / blockSize);
        
        // Use the larger distance for diagonal movement
        const blocksMoved = Math.max(blocksMovedX, blocksMovedY);

        if (blocksMoved > 0) {
          // Add intermediate blocks along the path
          for (let i = 1; i <= blocksMoved; i++) {
            const ratio = i / blocksMoved;
            const blockX = startX + Math.round((player.x - startX) * ratio);
            const blockY = startY + Math.round((player.y - startY) * ratio);
            
            trailBlocks.push({ x: blockX, y: blockY });
            console.log("Added trail block at:", { x: blockX, y: blockY });
        trailCtx.fillStyle = player.color;
            trailCtx.fillRect(blockX, blockY, player.size, player.size);
          }
          console.log(`Total blocks moved: ${blocksMoved}`);
        }
      }

      drawPlayer();
      soundEffect.currentTime = 0;
      soundEffect.play();

      checkCheckpointCollision();
      if (currentLevel === 7) checkLevel7BlocksCollision(player);
      checkWin();

      if (onMoveComplete) onMoveComplete();
    } else {
      player.x = newX;
      player.y = newY;

      drawPlayer();
      checkCheckpointCollision();
      if (currentLevel === 7) checkLevel7BlocksCollision(player);
      checkWin();

      requestAnimationFrame(doTheMove);
    }
  };

  requestAnimationFrame(doTheMove);
}

// Define an array of audio files
const buttonSounds = [
  new Audio("./assets/audio/POP1-3.wav"),
  new Audio("./assets/audio/POP2-3.wav"),
  new Audio("./assets/audio/POP3-3.wav"),
];

// Function to play a random sound
function playRandomSound() {
  const randomIndex = Math.floor(Math.random() * buttonSounds.length);
  const sound = buttonSounds[randomIndex];
  sound.currentTime = 0; // Reset to start
  sound.play();
}

document.querySelectorAll(".controls button").forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.direction;

    if (isMoving) return; // Prevent actions while moving

    // Prevent duplicate consecutive moves
    if (moveQueue.length > 0 && moveQueue[moveQueue.length - 1] === direction) {
      console.log(`Duplicate move ${direction} ignored.`);
      return; // Ignore the move if it's a duplicate
    }

    // If the move queue is empty, validate the first move
    if (moveQueue.length === 0) {
      let nextX = player.x,
        nextY = player.y;
      switch (direction) {
        case "ArrowUp":
          nextY -= player.size;
          break;
        case "ArrowDown":
          nextY += player.size;
          break;
        case "ArrowLeft":
          nextX -= player.size;
          break;
        case "ArrowRight":
          nextX += player.size;
          break;
      }

      // Check if there's a wall for the first move
      if (isCollision(nextX, nextY)) {
        console.log(`Blocked! You can't move ${direction}`);
        showErrorPopup();
        playErrorSound(); // Play the error sound
        return; // Prevent adding the invalid move to the queue
      }
    }

    // If no collision or duplicate, add the move
    moveQueue.push(direction);
    playRandomSound();
    addDirectionToTracker(direction);
    console.log(`Move ${direction} added to the queue.`);
  });
});
async function restartGame() {
  console.log("Restarting game...");

  // Reset counters with null checks
  const restartCounter = document.getElementById('restartCounter');
  if (restartCounter) {
    restartCounter.textContent = '0';
  }

  // Stop all active timers and asynchronous loops
  clearAllTimers();
  level7RunId++; // Increment to cancel async loops
  stopLevel7Blocks = true; // Ensure movement stops immediately

  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

  // Reset player and game state
  playerSteps = [];
  playerLastPositions = [];
  lastCorrectStep = 0;
  isMoving = false;
  isExecutingMoves = false;
  currentDirection = null;
  nextDirection = null;
  lastDirection = null;
  moveQueue.length = 0;
  moveCount = 0;

  // Reset player position
  player.x = player.startX;
  player.y = player.startY;

  // Clear tracker list
  trackerList.innerHTML = "";

  // Hide win popup
  winPopup.style.display = "none";
  
  // Reset trail blocks but add initial position
  trailBlocks = [];
  const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";
  if (isTailEquipped) {
    trailBlocks.push({ x: player.x, y: player.y });
    trailCtx.fillStyle = player.color;
    trailCtx.fillRect(player.x, player.y, player.size, player.size);
  }

  // Update counter styles based on equipped state
  updateCounterStyles();

  // Redraw the maze and player
  recolorMaze();
  drawPlayer();

  // Restart timers and checkpoints
  startTimer();
  initializeCheckpoints();

  if (currentLevel === 7) {
    level7Blocks = [];
    stopLevel7Blocks = true;
    initializeLevel7Blocks(true); // Reinitialize blocks
  }
}

function updateCounterStyles() {
  const isBrainPaletteEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  const counter = document.getElementById('restartCounter');
  
  if (counter) {
    if (isBrainPaletteEquipped) {
      counter.classList.add('equipped');
    } else {
      counter.classList.remove('equipped');
    }
  }
}

// Update the counter styles when the brain palette is toggled
document.addEventListener('DOMContentLoaded', () => {
  const unlockablesScreen = document.getElementById('unlockablesScreen');
  if (unlockablesScreen) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const brainPaletteButton = unlockablesScreen.querySelector('button');
          if (brainPaletteButton) {
            brainPaletteButton.addEventListener('click', updateCounterStyles);
          }
        }
      });
    });
    
    observer.observe(unlockablesScreen, { childList: true, subtree: true });
  }
});

function executeMoves() {
  if (isExecutingMoves || moveQueue.length === 0) return; // Prevent overlap
  isExecutingMoves = true;

  // Clear any existing trail and reset trail blocks
  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";
  
  console.log("Starting new move sequence. Clearing trail blocks.");
  // Reset trail blocks to only include current position
  trailBlocks = [];
  if (isTailEquipped) {
    trailBlocks = [{ x: player.x, y: player.y }];
    console.log("Initial trail block at:", { x: player.x, y: player.y });
    trailCtx.fillStyle = player.color;
    trailCtx.fillRect(player.x, player.y, player.size, player.size);
  }

  const processMove = () => {
    if (moveQueue.length === 0 || isMoving) {
      if (!isMoving) {
        if (trailBlocks.length > 0) {
        console.log("Move sequence complete. Total trail blocks:", trailBlocks.length);
        console.log("Trail block positions:", trailBlocks);
        // All moves completed, start the merge animation
        animateTrailMerge();
        }
        // Ensure player is redrawn in secret level
        if (currentLevel === "6secret") {
          recolorMaze();
          drawPlayer();
        }
      }
      isExecutingMoves = false;
      return;
    }

    const direction = moveQueue.shift();
    currentDirection = direction;
    startMoving(() => {
      if (currentLevel === "6secret") {
        // Ensure player is visible after each move in secret level
        recolorMaze();
        drawPlayer();
      }
      processMove(); // Process next move after current one completes
    });
  };

  processMove();
}

// Add keyboard controls
document.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    const direction = event.key;

    if (isMoving) return; // Prevent actions while moving

    // Prevent duplicate consecutive moves
    if (moveQueue.length > 0 && moveQueue[moveQueue.length - 1] === direction) {
      console.log(`Duplicate move ${direction} ignored.`);
      return; // Ignore the move if it's a duplicate
    }

    // If the move queue is empty, validate the first move
    if (moveQueue.length === 0) {
      let nextX = player.x,
        nextY = player.y;
      switch (direction) {
        case "ArrowUp":
          nextY -= player.size;
          break;
        case "ArrowDown":
          nextY += player.size;
          break;
        case "ArrowLeft":
          nextX -= player.size;
          break;
        case "ArrowRight":
          nextX += player.size;
          break;
      }

      // Check if there's a wall for the first move
      if (isCollision(nextX, nextY)) {
        console.log(`Blocked! You can't move ${direction}`);
        showErrorPopup();
        playErrorSound(); // Play the error sound
        return; // Prevent adding the invalid move to the queue
      }
    }

    // If no collision or duplicate, add the move
    moveQueue.push(direction);
    playRandomSound();
    addDirectionToTracker(direction);
    console.log(`Move ${direction} added to the queue.`);
  }

  // Check for ENTER key
  else if (event.key === "Enter") {
    console.log("ENTER key pressed. Confirm button triggered.");
    confirmButton.click(); // Simulate the Confirm button click
  }
});

function transitionToSecretLevel(preservedDirection) {
  // Only transition once to prevent multiple calls
  if (currentLevel === "6secret") return;
  
  console.log("Transitioning to secret level...");
  
  // Create new image and preload it
  const newImage = new Image();
  newImage.onload = () => {
    console.log("Secret level image loaded successfully");
    
    // Now that image is loaded, do the transition
    currentLevel = "6secret";
    clearAllTimers();
    
    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    
    // Update the main maze image reference
    mazeImage.src = newImage.src;
    
    // Reset player position to adjusted coordinates
    player.startX = 0;
    player.startY = 120;
    player.x = player.startX;
    player.y = player.startY;
    
    // Set exit position for secret level (will be invisible)
    exit.x = 180;
    exit.y = 380;
    
    // Extract maze data and initialize
    extractMazeData();
    
    // Show the "secret" announcement
    showLevelAnnouncement("secret");
    
    // Reset game state
    isExecutingMoves = false;
    isMoving = false;
    moveQueue.length = 0;
    isTrailAnimating = false;
    trailBlocks = [];
    moveCount = 0;
    playerSteps = [];
    trackerList.innerHTML = '';
    
    // Initialize the secret level checkpoints and gaps
    if (localStorage.getItem('hasSecretKey') === 'true') {
      gaps.push({
        level: "6secret",
        x: 0,
        y: 131,
        width: 20,
        height: 20,
        isReturnGap: true,
        color: "rgb(153, 153, 153)"
      });
    } else {
      checkpoints.push({
        x: 340,
        y: 200,
        size: 20,
        touched: false,
        solid: false,
        color: "#00FF00"
      });
    }
    
    // Override drawExit function temporarily for secret level
    drawExit = function() {
      if (currentLevel === "6secret") return;
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--exit-color")
        .trim();
      ctx.fillRect(exit.x, exit.y, exit.size, exit.size);
    };
    
    // Final redraw with clean state
    recolorMaze();
    drawCheckpoints();
    drawPlayer();
    
    // Resume movement in the same direction if provided
    if (preservedDirection) {
      requestAnimationFrame(() => {
        moveQueue.push(preservedDirection);
        executeMoves();
      });
    }
  };
  
  newImage.onerror = (err) => {
    console.error("Failed to load secret level image:", err);
  };
  
  // Start loading the image
  newImage.src = "level6secret.png";
}

function returnToLevelSix() {
    console.log("Returning to level 6...");
    
    // Store current movement direction
    const preservedDirection = currentDirection;
    
    // Create and preload new image
    const newImage = new Image();
    newImage.onload = () => {
        console.log("Level 6 image loaded successfully");
        
        // Now that image is loaded, do the transition
        currentLevel = 6;
        clearAllTimers();
        
        // Clear canvases
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        
        // Update the main maze image reference
        mazeImage.src = newImage.src;
        
        // Reset player position to a safe spot away from the gap
        player.startX = 380;
        player.startY = 260;
        player.x = player.startX;
        player.y = player.startY;
        
        // Set exit position for level 6
        exit.x = 180;
        exit.y = 380;
        
        // Extract maze data and initialize
        extractMazeData();
        
        // Show level announcement
        showLevelAnnouncement("6");
        
        // Reset game state
        isExecutingMoves = false;
        isMoving = false;
        moveQueue.length = 0;
        isTrailAnimating = false;
        trailBlocks = [];
        moveCount = 0;
        playerSteps = [];
        trackerList.innerHTML = '';
        
        // Clear the secret key state
        localStorage.removeItem('hasSecretKey');
        
        // Restore original drawExit function
        drawExit = function() {
            ctx.fillStyle = getComputedStyle(document.documentElement)
                .getPropertyValue("--exit-color")
                .trim();
            ctx.fillRect(exit.x, exit.y, exit.size, exit.size);
        };
        
        // Reinitialize level 6 gaps with new color
        gaps.length = 0;
        gaps.push({
            level: 6,
            x: 411,
            y: 271,
            width: 11,
            height: 20,
            isEntranceGap: true,
            color: "#999999"
        });
        
        // Final redraw with clean state
        recolorMaze();
        renderMazeWithGaps(ctx, gaps);
        drawPlayer();
        drawExit();
        
        // Resume movement in the same direction if there was one
        if (preservedDirection && !isMoving && !isExecutingMoves) {
            requestAnimationFrame(() => {
                moveQueue.push(preservedDirection);
                executeMoves();
            });
        }
    };
    
    newImage.onerror = (err) => {
        console.error("Failed to load level 6 image:", err);
    };
    
    // Start loading the image
    newImage.src = "level6(3).png";
}
