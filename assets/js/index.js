// Environment check
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const storage = isNode ? require('fs') : null;
const path = isNode ? require('path') : null;
const saveFilePath = isNode ? path.join(__dirname, "levelCompletionTimes.json") : null;
const achievementFilePath = isNode ? path.join(__dirname, "achievementProgress.json") : null;

let levelCompletionTimes = {};

// Data handling functions
function saveData(key, data) {
    try {
        if (isNode && storage) {
            const filePath = key === 'levelCompletionTimes' ? saveFilePath : achievementFilePath;
            storage.writeFileSync(filePath, JSON.stringify(data));
        } else {
            localStorage.setItem(key, JSON.stringify(data));
        }
        return true;
    } catch (err) {
        console.error('Failed to save data:', err);
        return false;
    }
}

function loadData(key) {
    try {
        if (isNode && storage) {
            const filePath = key === 'levelCompletionTimes' ? saveFilePath : achievementFilePath;
            if (storage.existsSync(filePath)) {
                return JSON.parse(storage.readFileSync(filePath, 'utf8'));
            }
        } else {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }
    } catch (err) {
        console.error('Failed to load data:', err);
        return null;
    }
}

// Game elements
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
const levelEnterSound = new Audio('assets/audio/levelenter.wav');
const backgroundMusic = new Audio("./assets/audio/i careOST.mp3"); // Background music
const volumeSlider = document.getElementById("volumeSlider"); // Slider
const volumeValueDisplay = document.getElementById("volumeValue"); // Display value
console.log(document.getElementById("levelAnnouncement")); // Log the element

// Initialize audio settings
backgroundMusic.loop = true;
backgroundMusic.volume = 0.1; // Set initial volume to match slider

// Add soul image loading at the top with other global variables
const soulImage = new Image();
soulImage.src = "soul1.png";
const soulImage2 = new Image();
soulImage2.src = "soul2.png";

// Initialize soul frame to 1 only when the game first loads
let currentSoulFrame = 1;
let soulAnimationInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const levelSelection = document.getElementById("levelSelection"); // Declare this variable
  const startGameButton = document.getElementById("startGameButton");
  console.log(document.getElementById("levelAnnouncement")); // Log the element

  const unlockablesButton = document.getElementById("unlockablesButton")
  const unlockablesScreen = document.getElementById('fullscreenOverlay');
  const unlockablesBackButton = document.getElementById('unlockablesBackButton');
  
  console.log("Game is starting. Loading saved data...");
  loadLevelCompletionTimes();
  loadAchievementProgress(); // Load achievements on startup
  updateCounterStyles(); // Initialize counter styles on page load

  // Load saved achievement progress
  const savedProgress = localStorage.getItem('achievementProgress');
  if (savedProgress) {
    achievementProgress = JSON.parse(savedProgress);
  }

  volumeValueDisplay.textContent = "10%";

  // Music settings
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.1;

  startGameButton.addEventListener("click", () => {
    // Hide start screen
    startScreen.style.display = "none";

    // Show level selection screen
    levelSelection.style.display = "flex";

    // Remove background music autoplay from here
  });

  volumeSlider.addEventListener("input", (e) => {
    const volume = parseFloat(e.target.value);
    // Update all audio elements with the new volume
    backgroundMusic.volume = volume;
    soundEffect.volume = volume;
    levelEnterSound.volume = volume;
    
    // Update volume display
    volumeValueDisplay.textContent = Math.round(volume * 100) + "%";
  });

  let isAnimating = false; // Global flag to track if an animation is active
  let lastYPositions = {}; // Object to store the last Y position for each SVG
  const activeYPositions = []; // Array to track current spawn positions

  achievementsButton.addEventListener('click', () => {
    console.log("Loading progress before opening modal...");
    loadAchievementProgress(); // Ensure state is loaded
    achievementsModal.classList.add('active');
    startAchievementAnimation();

    // Reset all progress bars to 0 initially
    const progressBars = document.querySelectorAll('.progressFill');
    const percentages = document.querySelectorAll('.progressPercentage');
    const statuses = document.querySelectorAll('.achievementStatus');

    progressBars.forEach(bar => bar.style.width = '0%');
    percentages.forEach(percent => percent.textContent = '0%');
    statuses.forEach(status => status.textContent = 'Locked');

    // Delay the animation to ensure the reset is visible
    setTimeout(() => {
        updateAchievementUIAnimated();
    }, 100);
  });

  closeButton.addEventListener('click', () => {
    achievementsModal.classList.remove('active');
    document.querySelector('.logo-container').style.display = 'block';
    clearAchievementAnimation();
  });

  // Remove any duplicate event listeners
  const existingHandler = document.getElementById("achievementsButton").onclick;
  if (existingHandler) {
    document.getElementById("achievementsButton").removeEventListener("click", existingHandler);
  }

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
  console.log("Updating UI with:", achievementProgress);

  const brainProgressFill = document.querySelector(".progressFill.theBrain");
  const brainProgressPercentage = document.querySelector(".progressPercentage.theBrain");
  const brainAchievementStatus = document.querySelector(".achievementStatus.theBrain");

  const tailProgressFill = document.querySelector(".progressFill.theTail");
  const tailProgressPercentage = document.querySelector(".progressPercentage.theTail");
  const tailAchievementStatus = document.querySelector(".achievementStatus.theTail");

  const soulProgressFill = document.querySelector(".progressFill.theSoul");
  const soulProgressPercentage = document.querySelector(".progressPercentage.theSoul");
  const soulAchievementStatus = document.querySelector(".achievementStatus.theSoul");

  const bodyProgressFill = document.querySelector(".progressFill.theBody");
  const bodyProgressPercentage = document.querySelector(".progressPercentage.theBody");
  const bodyAchievementStatus = document.querySelector(".achievementStatus.theBody");

  // Reset all progress bars to 0
  if (brainProgressFill) brainProgressFill.style.width = '0%';
  if (tailProgressFill) tailProgressFill.style.width = '0%';
  if (soulProgressFill) soulProgressFill.style.width = '0%';
  if (bodyProgressFill) bodyProgressFill.style.width = '0%';

  if (brainProgressPercentage) brainProgressPercentage.textContent = '0%';
  if (tailProgressPercentage) tailProgressPercentage.textContent = '0%';
  if (soulProgressPercentage) soulProgressPercentage.textContent = '0%';
  if (bodyProgressPercentage) bodyProgressPercentage.textContent = '0%';

  // Update each achievement's progress
  if (achievementProgress.theBrain) {
    const progress = achievementProgress.theBrain.progress;
    if (brainProgressFill) {
      animateProgressUpdate(progress, (value) => {
        brainProgressFill.style.width = `${value}%`;
        brainProgressPercentage.textContent = `${Math.round(value)}%`;
      });
    }
    if (brainAchievementStatus) {
      brainAchievementStatus.textContent = achievementProgress.theBrain.status;
    }
  }

  if (achievementProgress.theTail) {
    const progress = achievementProgress.theTail.progress;
    if (tailProgressFill) {
      animateProgressUpdate(progress, (value) => {
        tailProgressFill.style.width = `${value}%`;
        tailProgressPercentage.textContent = `${Math.round(value)}%`;
      });
    }
    if (tailAchievementStatus) {
      tailAchievementStatus.textContent = achievementProgress.theTail.status;
    }
  }

  if (achievementProgress.theSoul) {
    const progress = achievementProgress.theSoul.progress;
    if (soulProgressFill) {
      animateProgressUpdate(progress, (value) => {
        soulProgressFill.style.width = `${value}%`;
        soulProgressPercentage.textContent = `${Math.round(value)}%`;
      });
    }
    if (soulAchievementStatus) {
      soulAchievementStatus.textContent = achievementProgress.theSoul.status;
    }
  }

  if (achievementProgress.theBody) {
    const progress = achievementProgress.theBody.progress;
    if (bodyProgressFill) {
      animateProgressUpdate(progress, (value) => {
        bodyProgressFill.style.width = `${value}%`;
        bodyProgressPercentage.textContent = `${Math.round(value)}%`;
      });
    }
    if (bodyAchievementStatus) {
      bodyAchievementStatus.textContent = achievementProgress.theBody.status;
    }
  }
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
  document.querySelector('.logo-container').style.display = 'none';
  console.log("Loading progress before opening achievements...");
  loadAchievementProgress(); // Load progress into memory

  console.log("Current achievementProgress:", achievementProgress);

  updateAchievementUIAnimated(); // Update the UI with loaded progress
});

// Initialize achievement progress with consistent structure
let achievementProgress = {
  theBrain: {
    progress: 0,
    status: "Locked"
  },
  theTail: {
    progress: 0,
    status: "Locked"
  },
  theSoul: {
    progress: 0,
    status: "Locked"
  },
  theBody: {
    progress: 0,
    status: "Locked"
  }
};

function saveAchievementProgress() {
  localStorage.setItem('achievementProgress', JSON.stringify(achievementProgress));
  updateAchievementUIAnimated();
}

function loadAchievementProgress() {
  const savedProgress = localStorage.getItem('achievementProgress');
  if (savedProgress) {
    achievementProgress = JSON.parse(savedProgress);
  }
  updateAchievementUIAnimated();
}

// Update progress bars and status
function updateAchievementDisplay() {
    // Update The Brain achievement
    const brainProgressBar = document.querySelector('.progressFill.theBrain');
    const brainPercentage = document.querySelector('.progressPercentage.theBrain');
    const brainStatus = document.querySelector('.achievementStatus.theBrain');
    
    if (brainProgressBar && brainPercentage && brainStatus) {
        brainProgressBar.style.width = `${achievementProgress.theBrain.progress}%`;
        brainPercentage.textContent = `${achievementProgress.theBrain.progress}%`;
        brainStatus.textContent = achievementProgress.theBrain.status;
    }

    // Update The Tail achievement
    const tailProgressBar = document.querySelector('.progressFill.theTail');
    const tailPercentage = document.querySelector('.progressPercentage.theTail');
    const tailStatus = document.querySelector('.achievementStatus.theTail');
    
    if (tailProgressBar && tailPercentage && tailStatus) {
        tailProgressBar.style.width = `${achievementProgress.theTail.progress}%`;
        tailPercentage.textContent = `${achievementProgress.theTail.progress}%`;
        tailStatus.textContent = achievementProgress.theTail.status;
    }

    // Update The Soul achievement
    const soulProgressBar = document.querySelector('.progressFill.theSoul');
    const soulPercentage = document.querySelector('.progressPercentage.theSoul');
    const soulStatus = document.querySelector('.achievementStatus.theSoul');
    
    if (soulProgressBar && soulPercentage && soulStatus) {
        soulProgressBar.style.width = `${achievementProgress.theSoul.progress}%`;
        soulPercentage.textContent = `${achievementProgress.theSoul.progress}%`;
        soulStatus.textContent = achievementProgress.theSoul.status;
    }
}

unlockablesButton.addEventListener('click', () => {
  updateUnlockablesUI();
  const unlockablesCenterWindow = document.getElementById('unlockablesCenterWindow');
  unlockablesCenterWindow.scrollTop = 0; // Reset scroll position to top
  unlockablesScreen.style.display = 'flex';
  document.querySelector('.logo-container').style.display = 'none';
});

unlockablesBackButton.addEventListener('click', () => {
  unlockablesScreen.style.display = 'none';
  document.querySelector('.logo-container').style.display = 'block';
});

let checkpointsTouched = { first: false, second: false };

let checkpoints = []; // Change to an array to hold multiple checkpoints

function initializeCheckpoints() {
    checkpoints = [];
    
    // For level 8, load the saved path data instead of resetting
    if (currentLevel === 8) {
        let pathsCompleted = JSON.parse(localStorage.getItem('level8Paths') || '{"first": false, "second": false}');
        checkpointsTouched = { 
            first: pathsCompleted.first, 
            second: pathsCompleted.second 
        };
        
        const checkpoint1 = { x: 300, y: 0, size: 20, touched: false, solid: false };
        const checkpoint2 = { x: 60, y: 0, size: 20, touched: false, solid: false };
        checkpoints.push(checkpoint1, checkpoint2);
    } else if (currentLevel === 9) {
        const level9Checkpoint = { x: 120, y: 320, size: 20, touched: false, solid: false, color: "#FF6A00" };
        checkpoints.push(level9Checkpoint);
    } else if (currentLevel === "6secret") {
        const secretCheckpoint = { x: 340, y: 200, size: 20, touched: false, solid: false, color: "#00FF00" }; // Key checkpoint
        checkpoints.push(secretCheckpoint);
    } else if (currentLevel === 5) {
        // Remove any existing level 5 checkpoint DOM element
        const existingCheckpoint = document.getElementById('level5Checkpoint');
        if (existingCheckpoint) {
            existingCheckpoint.remove();
        }

        // Create the checkpoint as a DOM element
        const checkpointElement = document.createElement('div');
        checkpointElement.id = 'level5Checkpoint';
        checkpointElement.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            left: 305px;
            top: 405px;
            background-color: #999999;
            opacity: 1;
            z-index: 2;
        `;
        
        // Add it to the maze container
        const mazeContainer = document.querySelector('.maze-container');
        if (mazeContainer) {
            mazeContainer.appendChild(checkpointElement);
        }

        // Still keep track of it in the checkpoints array for consistency
        const level5Checkpoint = { x: 294, y: 400, size: 10, touched: false, solid: false, color: "#FF0000", opacity: 0.5, isDOMElement: true };
        checkpoints.push(level5Checkpoint);
    }
}

// Draw the checkpoints on the canvas
function drawCheckpoints() {
    if (checkpoints.length === 0) return;

    const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";

    checkpoints.forEach((checkpoint) => {
        // Skip drawing if it's a DOM element
        if (checkpoint.isDOMElement) return;

        // For secret level checkpoint, only draw if not touched
        if (currentLevel === "6secret") {
            if (!checkpoint.touched) {
                ctx.fillStyle = checkpoint.color || "#00FF00";
                ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.size, checkpoint.size);
            }
        } else if (currentLevel === 9) {
            // Special handling for level 9 checkpoints
            if (checkpoint.solid) {
                ctx.fillStyle = isEquipped ? "#8A314E" : "#222222";
                ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.size, checkpoint.size);
            } else {
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
    let shouldRedraw = false;

    checkpoints.forEach((checkpoint, index) => {
        // For level 5's DOM element checkpoint
        if (checkpoint.isDOMElement && currentLevel === 5) {
            const checkpointElement = document.getElementById('level5Checkpoint');
            if (checkpointElement && !checkpoint.touched) {
                const checkpointRect = checkpointElement.getBoundingClientRect();
                const playerRect = document.getElementById('mazeCanvas').getBoundingClientRect();
                const playerX = player.x + playerRect.left;
                const playerY = player.y + playerRect.top;

                if (playerX < checkpointRect.right &&
                    playerX + player.size > checkpointRect.left &&
                    playerY < checkpointRect.bottom &&
                    playerY + player.size > checkpointRect.top) {
                    checkpoint.touched = true;
                    checkpointElement.style.display = 'none';
                    shouldRedraw = true;
                }
            }
            return;
        }

        const isPlayerOnCheckpoint =
            player.x < checkpoint.x + checkpoint.size &&
            player.x + player.size > checkpoint.x &&
            player.y < checkpoint.y + checkpoint.size &&
            player.y + player.size > checkpoint.y;

        if (currentLevel === "6secret" && isPlayerOnCheckpoint && !checkpoint.touched) {
            checkpoint.touched = true;
            console.log("Got the secret key!"); // Debug log
            localStorage.setItem('hasSecretKey', 'true');
            
            // Update The Soul achievement progress
            achievementProgress.theSoul = {
                progress: 100,
                status: "Unlocked"
            };
            saveAchievementProgress();
            console.log("Achievement progress updated:", achievementProgress); // Debug log
            
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
            console.log("Return gap added:", gaps); // Debug log
            
            shouldRedraw = true;
        } else if (currentLevel === 9) {
            // For level 9, handle checkpoint becoming solid
            if (isPlayerOnCheckpoint && !checkpoint.touched) {
                // First touch - mark as touched
                checkpoint.touched = true;
                shouldRedraw = true;
            } else if (checkpoint.touched && !checkpoint.solid && !isPlayerOnCheckpoint) {
                // Player has moved away after touching - make it solid
                checkpoint.solid = true;
                shouldRedraw = true;
            }
        } else if (currentLevel === 8) {
            // For level 8, track each checkpoint separately
            if (isPlayerOnCheckpoint && !checkpoint.touched) {
                checkpoint.touched = true;
                if (index === 0) {
                    checkpointsTouched.first = true;
                } else if (index === 1) {
                    checkpointsTouched.second = true;
                }
                console.log("Level 8 checkpoints:", checkpointsTouched); // Debug log
                shouldRedraw = true;

                // Check if both checkpoints are touched and update achievement progress
                if (checkpointsTouched.first && checkpointsTouched.second) {
                    achievementProgress.theBrain = {
                        progress: 100,
                        status: "Unlocked"
                    };
                    saveAchievementProgress();
                    console.log("Brain achievement progress updated:", achievementProgress);
                }
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

document.addEventListener("DOMContentLoaded", () => {
  startGameButton.addEventListener("click", () => {
    startScreen.style.display = "none"; // Hide the menu
    console.log("Transitioning to game...");
  });
});

function updateUnlockablesUI() {
  const unlockablesCenterWindow = document.getElementById("unlockablesCenterWindow");
  unlockablesCenterWindow.innerHTML = "";
  
  // Set up container for vertical stacking with scrolling
  unlockablesCenterWindow.style.display = "flex";
  unlockablesCenterWindow.style.flexDirection = "column";
  unlockablesCenterWindow.style.alignItems = "center";
  unlockablesCenterWindow.style.gap = "20px";
  unlockablesCenterWindow.style.overflowY = "auto";
  unlockablesCenterWindow.style.maxHeight = "80vh";
  unlockablesCenterWindow.style.padding = "20px 0";
  unlockablesCenterWindow.style.scrollbarWidth = "thin";
  unlockablesCenterWindow.style.scrollbarColor = "#999999 #222222";
  unlockablesCenterWindow.style.msOverflowStyle = "none";
  unlockablesCenterWindow.style.position = "relative";

  // Add webkit scrollbar styles
  const style = document.createElement('style');
  style.textContent = `
    #unlockablesCenterWindow::-webkit-scrollbar {
      width: 8px;
    }
    #unlockablesCenterWindow::-webkit-scrollbar-track {
      background: #222222;
    }
    #unlockablesCenterWindow::-webkit-scrollbar-thumb {
      background: #999999;
    }
  `;
  document.head.appendChild(style);

  let hasUnlockables = false;
  let isBrainPaletteEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  let isTailEffectEquipped = localStorage.getItem("isTailEffectEquipped") === "true";

  // Create array to store unlockables in order of unlock time
  const unlockedItems = [];
  
  if (achievementProgress.theBrain.status === "Unlocked") {
    unlockedItems.push({
      type: 'brain',
      element: createBrainUnlockable(isBrainPaletteEquipped)
    });
  }
  
  if (achievementProgress.theTail.status === "Unlocked") {
    unlockedItems.push({
      type: 'tail',
      element: createTailUnlockable(isTailEffectEquipped)
    });
  }
  
  if (achievementProgress.theSoul.status === "Unlocked") {
    unlockedItems.push({
      type: 'soul',
      element: createSoulUnlockable()
    });
  }

  if (unlockedItems.length > 0) {
    hasUnlockables = true;
    
    // Create a wrapper div for the unlockables
    const unlockablesWrapper = document.createElement('div');
    unlockablesWrapper.style.display = 'flex';
    unlockablesWrapper.style.flexDirection = 'column';
    unlockablesWrapper.style.gap = '20px';
    unlockablesWrapper.style.width = '100%';
    unlockablesWrapper.style.paddingTop = '0px';
    
    // Append unlockables in order
    unlockedItems.forEach(item => {
      unlockablesWrapper.appendChild(item.element);
    });
    
    unlockablesCenterWindow.appendChild(unlockablesWrapper);
  }

  if (!hasUnlockables) {
    unlockablesCenterWindow.textContent = "nothing here... for now";
    unlockablesCenterWindow.style.display = "flex";
    unlockablesCenterWindow.style.alignItems = "center";
    unlockablesCenterWindow.style.justifyContent = "center";
    unlockablesCenterWindow.style.color = "#222222";
    unlockablesCenterWindow.style.fontSize = "24px";
  }
}

// Helper functions to create unlockables (keep existing creation logic)
function createBrainUnlockable(isEquipped) {
      const unlockable = document.createElement("div");
      unlockable.style.display = "flex";
      unlockable.style.justifyContent = "space-between";
      unlockable.style.alignItems = "center";
      unlockable.style.width = "90%";
  unlockable.style.margin = "0 auto";
  unlockable.style.padding = "0px 0";
      unlockable.style.backgroundColor = "#222222";
      unlockable.style.color = "#CCCCCC";
  unlockable.style.minHeight = "200px";

      // Title (left)
      const title = document.createElement("div");
      title.style.marginLeft = "70px";
  title.style.width = "268px";
  title.style.fontSize = "29px";
      title.style.fontWeight = "bold";
  title.style.lineHeight = "1.2";
  title.style.textAlign = "center";
      title.style.display = "flex";
  title.style.flexDirection = "column";
  title.style.justifyContent = "center";
  title.style.gap = "10px";

      const brainText = document.createElement("span");
      brainText.textContent = "\"the brain\"";
      brainText.style.fontSize = "40px";
      brainText.style.fontStyle = "italic";
  brainText.style.fontWeight = "bold";
      brainText.style.fontFamily = "MS Mincho";
      brainText.style.backgroundColor = "#cccccc";
      brainText.style.color = "#D1406E";
  brainText.style.display = "inline-block";

      const paletteText = document.createElement("span");
  paletteText.textContent = "palette";
      paletteText.style.width = "100px";
      paletteText.style.marginLeft = "35px";
      paletteText.style.backgroundColor = "#cccccc";
      paletteText.style.color = "#222222";
  paletteText.style.display = "inline-block";

      title.appendChild(brainText);
      title.appendChild(paletteText);
      unlockable.appendChild(title);

      // Icon (middle)
      const icon = document.createElement("img");
  icon.src = "assets/images/brainpalette.svg";
      icon.alt = "Brain Palette Icon";
  icon.style.width = "200px";
      icon.style.height = "200px";
  icon.style.margin = "0 15px";
      unlockable.appendChild(icon);

      // Equip Button (right)
      const equipButton = document.createElement("button");
  equipButton.textContent = isEquipped ? "unequip" : "equip";
      equipButton.style.fontFamily = "CustomFont";
  equipButton.style.width = isEquipped ? "145px" : "100px";
  equipButton.style.marginLeft = "10px";
      equipButton.style.marginRight = "100px";
      equipButton.style.fontSize = "34px";
      equipButton.style.backgroundColor = "#CCCCCC";
      equipButton.style.color = "#222222";
      equipButton.style.border = "none";
      equipButton.style.cursor = "pointer";

      equipButton.addEventListener("click", () => {
    isEquipped = !isEquipped;
    equipButton.textContent = isEquipped ? "unequip" : "equip";
    equipButton.style.width = isEquipped ? "145px" : "100px";
    localStorage.setItem("isBrainPaletteEquipped", isEquipped);

    console.log("Toggling equip state:", isEquipped);
    applyGameColors(isEquipped);
    updateCanvasBorder();
    updateTrackerContainerStyle();
    updateControlButtonStyles();
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
  return unlockable;
}

function createTailUnlockable(isEquipped) {
  const unlockable = document.createElement("div");
  unlockable.style.display = "flex";
  unlockable.style.justifyContent = "space-between";
  unlockable.style.alignItems = "center";
  unlockable.style.width = "90%";
  unlockable.style.margin = "0 auto";
  unlockable.style.padding = "0px 0";
  unlockable.style.backgroundColor = "#222222";
  unlockable.style.color = "#CCCCCC";
  unlockable.style.minHeight = "20px";

      // Title (left)
  const title = document.createElement("div");
  title.style.marginLeft = "70px";
  title.style.width = "268px";
  title.style.fontSize = "29px";
  title.style.fontWeight = "bold";
  title.style.lineHeight = "1.2";
  title.style.textAlign = "center";
  title.style.display = "flex";
  title.style.flexDirection = "column";
  title.style.justifyContent = "center";
  title.style.gap = "10px";

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

  title.appendChild(tailMainText);
  title.appendChild(tailSubText);
  unlockable.appendChild(title);

      // Icon (middle)
      const tailIcon = document.createElement("img");
      tailIcon.src = "assets/images/taileffect3.svg";
      tailIcon.alt = "Tail Effect Icon";
      tailIcon.style.width = "230px";
      tailIcon.style.height = "200px";
      tailIcon.style.margin = "0 15px";
  unlockable.appendChild(tailIcon);

      // Equip Button (right)
      const tailEquipButton = document.createElement("button");
  tailEquipButton.textContent = isEquipped ? "unequip" : "equip";
      tailEquipButton.style.fontFamily = "CustomFont";
  tailEquipButton.style.width = isEquipped ? "145px" : "100px";
      tailEquipButton.style.marginLeft = "10px";
      tailEquipButton.style.marginRight = "100px";
      tailEquipButton.style.fontSize = "34px";
      tailEquipButton.style.backgroundColor = "#CCCCCC";
      tailEquipButton.style.color = "#222222";
      tailEquipButton.style.border = "none";
      tailEquipButton.style.cursor = "pointer";

      tailEquipButton.addEventListener("click", () => {
    isEquipped = !isEquipped;
    tailEquipButton.textContent = isEquipped ? "unequip" : "equip";
    tailEquipButton.style.width = isEquipped ? "145px" : "100px";
    localStorage.setItem("isTailEffectEquipped", isEquipped);

    if (isEquipped) {
      console.log("Tail effect equipped!");
          } else {
              unequipTailEffect();
      console.log("Tail effect unequipped!");
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

  unlockable.appendChild(tailEquipButton);
  return unlockable;
}

function createSoulUnlockable() {
  const unlockable = document.createElement("div");
  unlockable.style.display = "flex";
  unlockable.style.justifyContent = "space-between";
  unlockable.style.alignItems = "center";
  unlockable.style.width = "90%";
  unlockable.style.margin = "0 auto";
  unlockable.style.padding = "0px 0";
  unlockable.style.backgroundColor = "#222222";
  unlockable.style.color = "#CCCCCC";
  unlockable.style.minHeight = "200px";

  // Title (left)
  const title = document.createElement("div");
  title.style.marginLeft = "70px";
  title.style.width = "268px";
  title.style.fontSize = "29px";
  title.style.fontWeight = "bold";
  title.style.lineHeight = "1.2";
  title.style.textAlign = "center";
  title.style.display = "flex";
  title.style.flexDirection = "column";
  title.style.justifyContent = "center";
  title.style.gap = "10px";

  const soulMainText = document.createElement("span");
  soulMainText.textContent = "\"the soul\"";
  soulMainText.style.fontSize = "40px";
  soulMainText.style.fontStyle = "italic";
  soulMainText.style.fontWeight = "bold";
  soulMainText.style.fontFamily = "MS Mincho";
  soulMainText.style.backgroundColor = "#cccccc";
  soulMainText.style.color = "#222222";
  soulMainText.style.display = "inline-block";

  const soulSubText = document.createElement("span");
  soulSubText.textContent = "appearance";
  soulSubText.style.width = "169px";
  soulSubText.style.marginLeft = "35px";
  soulSubText.style.backgroundColor = "#cccccc";
  soulSubText.style.color = "#222222";
  soulSubText.style.display = "inline-block";

  title.appendChild(soulMainText);
  title.appendChild(soulSubText);
  unlockable.appendChild(title);

  // Placeholder Icon (middle)
  const placeholderIcon = document.createElement("div");
  placeholderIcon.style.width = "200px";
  placeholderIcon.style.height = "200px";
  placeholderIcon.style.margin = "0 15px";
  placeholderIcon.style.backgroundColor = "#333333";
  placeholderIcon.style.display = "flex";
  placeholderIcon.style.justifyContent = "center";
  placeholderIcon.style.alignItems = "center";
  placeholderIcon.textContent = "?";
  placeholderIcon.style.fontSize = "100px";
  placeholderIcon.style.color = "#444444";
  unlockable.appendChild(placeholderIcon);

  // Equip Button (right)
  const equipButton = document.createElement("button");
  let isSoulAppearanceEquipped = localStorage.getItem("isSoulAppearanceEquipped") === "true";
  equipButton.textContent = isSoulAppearanceEquipped ? "unequip" : "equip";
  equipButton.style.fontFamily = "CustomFont";
  equipButton.style.width = isSoulAppearanceEquipped ? "145px" : "100px";
  equipButton.style.marginLeft = "10px";
  equipButton.style.marginRight = "100px";
  equipButton.style.fontSize = "34px";
  equipButton.style.backgroundColor = "#CCCCCC";
  equipButton.style.color = "#222222";
  equipButton.style.border = "none";
  equipButton.style.cursor = "pointer";

  equipButton.addEventListener("click", () => {
    const wasEquipped = localStorage.getItem("isSoulAppearanceEquipped") === "true";
    localStorage.setItem("isSoulAppearanceEquipped", !wasEquipped);
    equipButton.textContent = !wasEquipped ? "unequip" : "equip";
    
    // Redraw the player with the new appearance
    drawPlayer();
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
  return unlockable;
}

function unequipTailEffect() {
  console.log("Unequipping tail effect. Clearing trail and resetting state.");
  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

  // Reset related state
  activeTrailSegments = []; // Assuming trail segments are tracked in this array
  localStorage.setItem("isTailEffectEquipped", false);
}

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

  // Update gap color in level 6
  if (currentLevel === 6) {
    const gapColor = isEquipped ? "#F96D99" : "rgb(153, 153, 153)";
    gaps.forEach(gap => {
      if (gap.isEntranceGap) {
        gap.color = gapColor;
      }
    });
    renderMazeWithGaps(ctx, gaps);
  }
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

document.getElementById("menuElement").addEventListener("load", () => {
  console.log("Menu element loaded");
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
    // Use the existing isNode variable from the top of the file
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
        localStorage.clear(); // Clear all localStorage items
    }

    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    console.log("Trail effect cleared on data reset.");

    // Reset colors to default
    resetColorsToDefault();

    // Reset unlockable state and UI
    resetUnlockables();

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
    // Clear all achievements
    achievementProgress = {
        theBrain: { progress: 0, status: "Locked" },
        theTail: { progress: 0, status: "Locked" },
        theSoul: { progress: 0, status: "Locked" },
        theBody: { progress: 0, status: "Locked" }
    };
    saveAchievementProgress();

    // Clear level 8 paths
    localStorage.setItem('level8Paths', JSON.stringify({ first: false, second: false }));

    // Clear level 9 completion state
    localStorage.setItem('hasGoldCoin', 'false');

    // Clear all level completion times
    levelCompletionTimes = {};
    localStorage.removeItem('levelCompletionTimes');
    
    // Reset timer displays
    for (let i = 1; i <= 9; i++) {
        const timeLabel = document.getElementById(`level${i}Timer`);
        if (timeLabel) {
            timeLabel.textContent = '';
            timeLabel.style.display = 'none';
        }
    }

    // Reset unlockables
    resetUnlockables();
    
    // Reset colors to default
    resetColorsToDefault();

    // Show notification
    const notification = document.getElementById('resetNotification');
    notification.classList.remove('hidden');
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 2000);
}

function resetUnlockables() {
    // Clear unlockables data and unequip all items
    localStorage.removeItem("isBrainPaletteEquipped");
    localStorage.removeItem("isTailEffectEquipped");
    localStorage.removeItem("isSoulAppearanceEquipped");
    localStorage.removeItem("hasSecretKey");

    // Update the UI to show no unlockables
    const unlockablesCenterWindow = document.getElementById("unlockablesCenterWindow");
    unlockablesCenterWindow.innerHTML = "nothing here... for now";

    // Reset styles to default
    unlockablesCenterWindow.style.display = "flex";
    applyGameColors(false); // Revert game colors to default
    updateCanvasBorder();
    updateTrackerContainerStyle();
    updateControlButtonStyles();

    // Clear any trail effects
    if (trailCtx) {
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    }
    trailBlocks = [];

    // Redraw player with default appearance
    drawPlayer();
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
    // Get existing times
    let storedTimes = loadData('levelCompletionTimes') || {};
    
    // Update the time for this level
    storedTimes[level] = time;
    
    // Save the updated times
    if (saveData('levelCompletionTimes', storedTimes)) {
        console.log(`Timer successfully saved for ${level}: ${time}`);
    } else {
        console.error(`Failed to save timer for ${level}`);
    }
}

function loadLevelCompletionTimes() {
    const times = loadData('levelCompletionTimes');
    if (times) {
        // Use Object.assign to update the existing object instead of reassignment
        Object.assign(levelCompletionTimes, times);
        updateLevelCompletionTime();
    }
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
    // Clear existing state
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    clearCheckpoints();
    clearLevel7Blocks();
    gaps.length = 0;

    // Initialize shadow trail canvas if it exists
    if (shadowTrailCanvas && shadowTrailCtx) {
        shadowTrailCanvas.width = mazeCanvas.width;
        shadowTrailCanvas.height = mazeCanvas.height;
        shadowTrailCtx.clearRect(0, 0, shadowTrailCanvas.width, shadowTrailCanvas.height);
        shadowTrailCtx.fillStyle = "#222222";
    }

    console.log("Current Level:", currentLevel);
    console.log("Gaps:", gaps);

    // Reset player position
    player.x = playerPosition.x;
    player.y = playerPosition.y;
    player.startX = playerPosition.x;
    player.startY = playerPosition.y;

    // Set exit position
    exit.x = exitPosition.x;
    exit.y = exitPosition.y;

    // Load maze image
    mazeImage.src = mazeImageSrc;

    // Wait for the maze image to load before initializing
    mazeImage.onload = () => {
        console.log(`Maze image loaded: ${mazeImageSrc}`);
        
        // Extract maze data for collision detection
        extractMazeData();

        // Initialize level-specific features
        if (currentLevel === 6) {
            const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
            const gapColor = isEquipped ? "#F96D99" : "rgb(153, 153, 153)";
            
            gaps.push({
                level: 6,
                x: 391,
                y: 271,
                width: 31,
                height: 20,
                color: "transparent"
            });
            gaps.push({
                level: 6,
                x: 411,
                y: 271,
                width: 11,
                height: 20,
                isEntranceGap: true,
                color: gapColor
            });
            console.log("Gaps initialized for level 6:", gaps);
        } else if (currentLevel === 5) {
            initializeLevel5Gap();
            initializeCheckpoints();
            console.log("Gaps and checkpoints initialized for level 5:", gaps, checkpoints);
        } else if (currentLevel === 7) {
            initializeLevel7Blocks();
        } else if (currentLevel === 8 || currentLevel === 9) {
            initializeCheckpoints();
            console.log("Checkpoints initialized for level:", currentLevel, checkpoints);
        }

        // Initial draw of all elements
        recolorMaze();
        
        if (currentLevel === 6 || currentLevel === 5) {
            renderMazeWithGaps(ctx, gaps);
        }
        
        if (currentLevel === 7) {
            drawLevel7Blocks(ctx);
        }
        
        drawCheckpoints();
        drawPlayer();
        drawExit();
    };

    // Update UI elements
    updateBodyBackgroundColor();
    updateControlsButtonColors();
    levelSelection.style.display = "none";
    showLevelAnnouncement(currentLevel);
    
    const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
    applyGameColors(isEquipped);
    updateControlButtonStyles();
    
    // Show game elements
    gameContainer.style.display = "block";
    menuButton.style.display = "block";
    hintButton.style.display = "block";

    // Update visual styles
    updateCanvasBorder();
    updateMazeContainerColor();
    updateTrackerContainerStyle();

    // Handle next level button visibility
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
        try {
            await recolorMaze();
            drawLevel7Blocks(ctx);
            ctx.drawImage(trailCanvas, 0, 0);
            drawPlayer();
        } catch (error) {
            console.error("Error during redraw:", error);
        }

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

  const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  level7Blocks.forEach((block) => {
    ctx.fillStyle = isEquipped ? "#8A314E" : "#222222";
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

  const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  const buttonBgColor = isEquipped ? "#8A314E" : "#222222";
  const buttonHoverBgColor = isEquipped ? "#F96D99" : "#999999";
  const buttonTextColor = isEquipped ? "#FF6A99" : "#999999";
  const buttonHoverTextColor = isEquipped ? "#8A314E" : "#222222";
  const buttonBorderColor = isEquipped ? "#FF6A99" : "#999999";

  // Add Restart Button
  const restartButton = document.createElement("button");
  restartButton.style.fontFamily = "CustomFont";
  restartButton.textContent = "Restart";
  restartButton.style.margin = "10px";
  restartButton.style.padding = "10px 20px";
  restartButton.style.fontSize = "1rem";
  restartButton.style.backgroundColor = buttonBgColor;
  restartButton.style.color = buttonTextColor;
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
  menuButton.style.color = buttonTextColor;
  menuButton.style.border = `2px solid ${buttonBorderColor}`;
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
    restartButton.style.backgroundColor = buttonHoverBgColor;
    restartButton.style.color = buttonHoverTextColor;
  });
  restartButton.addEventListener("mouseout", () => {
    restartButton.style.backgroundColor = buttonBgColor;
    restartButton.style.color = buttonTextColor;
  });

  menuButton.addEventListener("mouseover", () => {
    menuButton.style.backgroundColor = buttonHoverBgColor;
    menuButton.style.color = buttonHoverTextColor;
  });
  menuButton.addEventListener("mouseout", () => {
    menuButton.style.backgroundColor = "#222";
    menuButton.style.color = buttonTextColor;
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
    checkpoints = [];
    // Remove level 5 checkpoint DOM element if it exists
    const level5Checkpoint = document.getElementById('level5Checkpoint');
    if (level5Checkpoint) {
        level5Checkpoint.remove();
    }
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
    // Hide the win popup
    const winPopup = document.getElementById("winPopup");
    if (winPopup) {
      winPopup.style.display = "none";
    }
    preStartGame(currentLevel + 1);
  }
}

function checkWin(bypass = false) {
    if ((player.x < exit.x + exit.size && player.x + player.size > exit.x &&
        player.y < exit.y + exit.size && player.y + player.size > exit.y) || bypass) {
        
        clearInterval(timerInterval);
        const elapsedTime = document.getElementById("timerDisplay").textContent.split(": ")[1];
        levelCompletionTimes[`level${currentLevel}`] = elapsedTime;
        saveLevelCompletionTime(`level${currentLevel}`, elapsedTime);
        updateLevelCompletionTime();

        // ... existing achievement check code ...

        // Display the win popup
        winPopup.style.display = "block";
        const moveCountMessage = document.getElementById("moveCountMessage");
        const menuButtonPopup = document.getElementById("menuButtonPopup");
        
        if (currentLevel === 9) {
            const hasGoldCoin = localStorage.getItem('hasGoldCoin');
            const hasMiniaturizer = localStorage.getItem('hasMiniaturizer');
            console.log('Level 9 Win - hasGoldCoin state:', hasGoldCoin);
            console.log('Level 9 Win - hasMiniaturizer state:', hasMiniaturizer);

            if ((!hasGoldCoin || hasGoldCoin === 'false' || hasGoldCoin === null) && (!hasMiniaturizer || hasMiniaturizer === 'false')) {
                console.log('Showing first-time completion popup');
                // First time completion
                moveCountMessage.innerHTML = `You won and it took you ${moveCount} moves.<br>
                    your time was ${elapsedTime}.<br>..loser<br><br>
                    you won all levels n all you got was:<br>
                    <div style="width: 100px; height: 100px; background-color: #111111; margin: 20px auto;"></div>
                    <div style="width: 150px; margin: 0 auto; text-align: center; font-family: 'BIZUDMincho'; font-size: 24px;">"gold coin"</div>`;
                menuButtonPopup.textContent = "equip n return";
                
                // Update The Body achievement when completing level 9 for the first time
                achievementProgress.theBody = {
                    progress: 100,
                    status: "Unlocked"
                };
                saveAchievementProgress();
            } else {
                console.log('Showing subsequent completion popup');
                // Subsequent completions
                moveCountMessage.innerHTML = `You won and it took you ${moveCount} moves.<br>
                    your time was ${elapsedTime}.<br>..loser<br><br>
                    you won all levels n all you got was:<br>
                    the gold coin<br>
                    it should be in your inventory`;
                menuButtonPopup.textContent = "return";
            }
        } else {
            moveCountMessage.innerHTML = `You won and it took you ${moveCount} moves.<br>
                your time was ${elapsedTime}.<br>..loser`;
        }

        if (currentLevel === 8) {
            // Check Level 8 progress and unlock achievement
            const progressFill = document.querySelector(".progressFill.theBrain");
            const progressPercentage = document.querySelector(".progressPercentage.theBrain");
            const achievementStatus = document.querySelector(".achievementStatus.theBrain");

            // Get stored path data
            let pathsCompleted = JSON.parse(localStorage.getItem('level8Paths') || '{"first": false, "second": false}');
            
            // Update paths based on which checkpoints were touched
            if (checkpointsTouched.first) {
                pathsCompleted.first = true;
            }
            if (checkpointsTouched.second) {
                pathsCompleted.second = true;
            }
            
            // Save updated path data
            localStorage.setItem('level8Paths', JSON.stringify(pathsCompleted));

            // Calculate progress based on completed paths
            let progress = 0;
            if (pathsCompleted.first) progress += 50;
            if (pathsCompleted.second) progress += 50;

            // Update achievement progress
            achievementProgress.theBrain = {
                progress: progress,
                status: progress === 100 ? "Unlocked" : "Locked"
            };
            saveAchievementProgress();

            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressPercentage) progressPercentage.textContent = `${progress}%`;
            if (achievementStatus && progress === 100) {
                achievementStatus.innerHTML = `Unlocked<br>Brain Palette`;
            }
        }

        const nextLevelButton = document.getElementById("nextLevelButton");
        const restartButton = document.querySelector("#winPopup button[onclick='restartGame()']");

        if (currentLevel < 9) {
            nextLevelButton.style.display = "block";
            menuButtonPopup.style.display = "none";
            restartButton.style.display = "block";
        } else {
            nextLevelButton.style.display = "none";
            menuButtonPopup.style.display = "block";
            restartButton.style.display = "none";
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
  { src: "level5(4).png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
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

function initializeLevel5Gap() {
    gaps.push({
        level: 5,
        x: 15,
        y: 243,
        width: 20,
        height: 20,
        color: "transparent"
    });
    console.log("Initialized level 5 gap:", gaps);
}

function preStartGame(level) {
    // Play level enter sound
    levelEnterSound.currentTime = 0; // Reset sound to start
    levelEnterSound.play().catch(e => console.warn("Could not play level enter sound:", e));
    
    // Start background music when entering a level
    backgroundMusic.currentTime = 0; // Reset music to start
    backgroundMusic.play().catch(e => console.warn("Could not play background music:", e));
    
    currentLevel = level; // Set current level
    console.log('Starting level:', level);
    if (level === 9) {
        console.log('Level 9 - hasGoldCoin state:', localStorage.getItem('hasGoldCoin'));
    }
    showLevelAnnouncement(level);
    // Reset game state
    moveCount = 0;
    playerSteps = [];
    playerLastPositions = [];
    lastCorrectStep = 0;
    isMoving = false;
    isExecutingMoves = false;
    currentDirection = null;
    nextDirection = null;
    lastDirection = null;
    moveQueue.length = 0;

    // Clear the tracker list
    const trackerList = document.getElementById("trackerList");
    if (trackerList) {
        trackerList.innerHTML = "";
    }

    // Clear any existing gaps
    const existingGaps = document.querySelectorAll('.maze-gap');
    existingGaps.forEach(gap => gap.remove());

    // Clear the restart counter
    const restartCounter = document.getElementById('restartCounter');
    if (restartCounter) {
        restartCounter.textContent = '';
    }

    // Initialize gaps for specific levels
    if (level === 6) {
        console.log("Initializing level 6 gaps");
        initializeLevel6Gap();
    } else if (level === 5) {
        console.log("Initializing level 5 gaps");
        initializeLevel5Gap();
    }

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

  // Hide the win popup
  const winPopup = document.getElementById("winPopup");
  if (winPopup) {
    winPopup.style.display = "none";
  }

  // Clear the tracker list
  const trackerList = document.getElementById("trackerList");
  if (trackerList) {
    trackerList.innerHTML = "";
  }

  // Clear any existing gaps
  const existingGaps = document.querySelectorAll('.maze-gap');
  existingGaps.forEach(gap => gap.remove());

  document.getElementById("levelSelection").style.display = "flex";
  document.getElementById("gameContainer").style.display = "none";
  menuButton.style.display = "none"; // Hide the Menu button
  hintButton.style.display = "none"; // Hide the Hint button when in menu
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
    // If the maze image isn't loaded yet, wait for it
    if (!mazeImage.complete || !mazeImage.naturalWidth) {
        console.log("Maze image not ready, waiting for load...");
        return new Promise((resolve) => {
            mazeImage.onload = () => {
                console.log("Maze image loaded, now recoloring");
                performRecolor();
                resolve();
            };
        });
    } else {
        return Promise.resolve(performRecolor());
    }
    function performRecolor() {
        const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";

        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = mazeImage.width || 400;  // Fallback width
        offscreenCanvas.height = mazeImage.height || 400;  // Fallback height
        const offscreenCtx = offscreenCanvas.getContext("2d");

        try {
            offscreenCtx.drawImage(mazeImage, 0, 0);
            const imageData = offscreenCtx.getImageData(
                0,
                0,
                offscreenCanvas.width,
                offscreenCanvas.height
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
        } catch (error) {
            console.error("Error in recolorMaze:", error);
        }
    }
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
    const currentPlayer = cPlayer || player;
    const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";
    const isSoulEquipped = localStorage.getItem("isSoulAppearanceEquipped") === "true";

    // Draw everything except trail blocks first
    recolorMaze();
    drawExit();
    drawCheckpoints();  // Draw checkpoints before shadow
    if (currentLevel === 7) {
        drawLevel7Blocks(ctx);
    }
    if (currentLevel === 6) {
        renderMazeWithGaps(ctx, gaps);
    }

    // Draw trail blocks
    if (isTailEquipped && !isTrailAnimating) {
        // Clear the trail canvas first
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        
        // Draw all trail blocks, only skipping current position if soul is equipped
        trailCtx.fillStyle = player.color;
        trailBlocks.forEach(block => {
            // Only skip current position if soul is equipped
            if (!isSoulEquipped || (block.x !== player.x || block.y !== player.y)) {
                trailCtx.fillRect(block.x, block.y, player.size, player.size);
            }
        });
        
        // Draw the trail
        ctx.drawImage(trailCanvas, 0, 0);
    }

    // Draw the player with soul image or default square
    if (isSoulEquipped && (soulImage.complete || soulImage2.complete)) {
        const currentImage = currentSoulFrame === 1 ? soulImage : soulImage2;
        ctx.save();
        ctx.translate(currentPlayer.x + currentPlayer.size/2, currentPlayer.y + currentPlayer.size/2);
        
        switch(currentDirection) {
            case "ArrowDown":
                ctx.rotate(Math.PI);
                break;
            case "ArrowLeft":
                ctx.rotate(-Math.PI/2);
                break;
            case "ArrowRight":
                ctx.rotate(Math.PI/2);
                break;
            default:
                break;
        }
        
        ctx.drawImage(currentImage, -currentPlayer.size/2, -currentPlayer.size/2, currentPlayer.size, currentPlayer.size);
        ctx.restore();
    } else {
        ctx.fillStyle = currentPlayer.color || player.color;
        ctx.fillRect(currentPlayer.x, currentPlayer.y, currentPlayer.size, currentPlayer.size);
    }

    // Draw shadow trail at current position if context exists
    if (shadowTrailCtx) {
        const shadowSize = currentPlayer.size + 6; // Make shadow slightly larger
        const shadowOffset = (shadowSize - currentPlayer.size) / 2;
        shadowTrailCtx.fillRect(
            currentPlayer.x - shadowOffset,
            currentPlayer.y - shadowOffset,
            shadowSize,
            shadowSize
        );
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
      const newCount = currentCount + totalBlocks;
      restartCounter.textContent = newCount > 0 ? newCount.toString() : '';
      trailBlocks = [];
      isTrailAnimating = false;
    }, 500);
  }, 550);
}

// Modify the startMoving function to handle trail animation
function startMoving(onMoveComplete) {
  if (isMoving) return;
  isMoving = true;

    const speed = player.size === 10 ? 1 : 2; // Slower speed for small player
  let dx = 0, dy = 0;
  
    // Define equipment states
    const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";
  const isSoulEquipped = localStorage.getItem("isSoulAppearanceEquipped") === "true";
    let lastTrailX = player.x;
    let lastTrailY = player.y;

    // Start soul animation if equipped
  if (isSoulEquipped) {
    clearInterval(soulAnimationInterval);
    soulAnimationInterval = setInterval(() => {
      currentSoulFrame = currentSoulFrame === 1 ? 2 : 1;
      drawPlayer();
    }, 250);
  }
  
    // Add initial trail block if tail is equipped and soul is not
    if (isTailEquipped && !isSoulEquipped) {
        trailBlocks.push({ x: player.x, y: player.y });
        trailCtx.fillStyle = player.color;
        trailCtx.fillRect(player.x, player.y, player.size, player.size);
    }

    // Determine movement direction
  switch (currentDirection) {
    case "ArrowUp": dy = -speed; break;
    case "ArrowDown": dy = speed; break;
    case "ArrowLeft": dx = -speed; break;
    case "ArrowRight": dx = speed; break;
  }

  const doTheMove = () => {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (isCollision(newX, newY)) {
            // Align player to the wall based on movement direction
        switch (currentDirection) {
            case "ArrowRight":
                    player.x = Math.floor((player.x + player.size) / scale) * scale - player.size;
                break;
            case "ArrowLeft":
                    player.x = Math.ceil(player.x / scale) * scale;
                break;
            case "ArrowDown":
                    player.y = Math.floor((player.y + player.size) / scale) * scale - player.size;
                break;
            case "ArrowUp":
                    player.y = Math.ceil(player.y / scale) * scale;
                break;
            }

      isMoving = false;

      // Stop soul animation when movement stops
      if (isSoulEquipped) {
        clearInterval(soulAnimationInterval);
        drawPlayer();
      }

      // Add final trail block at the last position
      if (isTailEquipped) {
        trailBlocks.push({ x: lastTrailX, y: lastTrailY });
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        trailBlocks.forEach(block => {
          if (!isSoulEquipped || (block.x !== player.x || block.y !== player.y)) {
            trailCtx.fillStyle = player.color;
            trailCtx.fillRect(block.x, block.y, player.size, player.size);
          }
        });
      }

      drawPlayer();
      soundEffect.currentTime = 0;
      soundEffect.play();

      checkCheckpointCollision();
      if (currentLevel === 7) checkLevel7BlocksCollision(player);
      checkWin();

      if (onMoveComplete) onMoveComplete();
      return;
    }

        // If no collision, continue moving
    player.x = newX;
    player.y = newY;

        // Update trail position for next block
        if (isTailEquipped) {
      lastTrailX = player.x;
      lastTrailY = player.y;
    }

    drawPlayer();
    requestAnimationFrame(doTheMove);
  };

    requestAnimationFrame(doTheMove);
}

// Modify restartGame to clear trail state
function restartGame() {
  console.log("Restarting game...");

  // Reset counters with null checks
  const restartCounter = document.getElementById('restartCounter');
  if (restartCounter) {
    restartCounter.textContent = ''; // Empty instead of '0'
  }

  // Stop all active timers and asynchronous loops
  clearAllTimers();
  level7RunId++; // Increment to cancel async loops
  stopLevel7Blocks = true; // Ensure movement stops immediately

  // Clear soul animation and reset to frame 1
  clearInterval(soulAnimationInterval);
  currentSoulFrame = 1;

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
  updateControlButtonStyles(); // Add this line

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

// Change from const to let for the drawExit function
let drawExit = function() {
    ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--exit-color")
        .trim();
    ctx.fillRect(exit.x, exit.y, exit.size, exit.size);
};

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
          gapElement.style.zIndex = '1';
          
          gapElement.style.pointerEvents = 'none'; // Prevent interaction

          // Append the gap to the maze-container
          mazeContainer.appendChild(gapElement);
      }
  }
}

// Global variables at the top of the file
let gaps = []; // Initialize empty gaps array

// Function to initialize level 6 entrance gap
function initializeLevel6Gap() {
    // Clear existing gaps
    gaps.length = 0;
    // Remove any existing gap elements from the DOM
    const existingGaps = document.querySelectorAll('.maze-gap');
    existingGaps.forEach(gap => gap.remove());
    
    // Add the entrance gap for level 6
    const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
    const gapColor = isEquipped ? "#F96D99" : "rgb(153, 153, 153)";
    
    gaps.push({
        level: 6,
        x: 411,
        y: 271,
        width: 11,
        height: 20,
        isEntranceGap: true,
        color: gapColor
    });
    
    // Render the gaps
    renderMazeWithGaps(ctx, gaps);
}

// Add this variable at the top level of the file
let hasLeftSpawnGap = false;

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

    // If in secret level and not in any gap, mark that player has left spawn area
    if (currentLevel === "6secret" && !inGap) {
        hasLeftSpawnGap = true;
        console.log("Player has left spawn area (not in any gap)"); // Debug log
    }

    if (inGap) {
        console.log(`Player is in a gap at (${newX}, ${newY})`);

        if (currentLevel === "6secret") {
            // Find the return gap
            const returnGap = gaps.find(gap => gap.isReturnGap);
            console.log("Return gap:", returnGap); // Debug log

            if (returnGap && 
                newX + cPlayer.size > returnGap.x &&
                newX < returnGap.x + returnGap.width &&
                newY + cPlayer.size > returnGap.y &&
                newY < returnGap.y + returnGap.height) {
                
                // Check if player has the soul achievement or the key
                const hasKey = localStorage.getItem('hasSecretKey') === 'true';
                const hasSoul = achievementProgress.theSoul.status === "Unlocked";
                const canReturn = hasKey || hasSoul;
                
                console.log("Return conditions:", { // Debug logs
                    hasKey,
                    hasSoul,
                    canReturn,
                    hasLeftSpawnGap
                });
                
                // Only allow return if player has left the spawn gap area first
                if (canReturn && hasLeftSpawnGap) {
                    console.log("Initiating return to level 6"); // Debug log
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
                            // Reset spawn protection flag
                            hasLeftSpawnGap = false;
                            // Return to level 6 and resume movement
                            returnToLevelSix();
                        }, 600); // Wait for trail merge animation
                    } else {
                        // No trail to collect, transition immediately and resume movement
                        hasLeftSpawnGap = false;
                        returnToLevelSix();
                    }
                } else {
                    console.log("Cannot return:", { // Debug log for failed return
                        reason: !canReturn ? "No key/soul" : "Haven't left spawn area"
                    });
                }
            }
        } else if (currentLevel === 6) {
            // Check for secret level entrance
            const entranceGap = gaps.find(gap => gap.isEntranceGap);
            console.log("Found entrance gap:", entranceGap); // Debug log
            
            if (entranceGap && 
                newX + cPlayer.size > entranceGap.x &&
                newX < entranceGap.x + entranceGap.width &&
                newY + cPlayer.size > entranceGap.y &&
                newY < entranceGap.y + entranceGap.height) {
                console.log("Player in entrance gap, initiating transition"); // Debug log
                
                // Check if we're already transitioning
                if (isTransitioning) {
                    console.log("Transition blocked - resetting flag"); // Debug log
                    isTransitioning = false;
                    return false;
                }
                
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
                        
                        // Reset spawn protection flag before transition
                        hasLeftSpawnGap = false;
                        
                        // Transition to secret level with preserved movement
                        transitionToSecretLevel(currentMovement);
                    }, 600);
                } else {
                    // No trail to collect, transition immediately with preserved movement
                    hasLeftSpawnGap = false;
                    transitionToSecretLevel(currentMovement);
                }
            }
        } else if (currentLevel === 5) {
            // Allow movement through level 5 gaps
            return false;
        }
        return false; // Allow movement in gaps
    }

    // For secret level, only check wall collisions and ignore canvas boundaries
    if (currentLevel === "6secret") {
        const mazeX = Math.floor(newX / scale);
        const mazeY = Math.floor(newY / scale);

        // Use the current visual size of the player for collision detection
        const currentSize = cPlayer.visualSize || cPlayer.size;

        // Check all sides for walls
        const hasWallRight = checkWallAtPoint(Math.floor((newX + currentSize) / scale), mazeY);
        const hasWallBottom = checkWallAtPoint(mazeX, Math.floor((newY + currentSize) / scale));
        const hasWallLeft = checkWallAtPoint(Math.floor(newX / scale), mazeY);
        const hasWallTop = checkWallAtPoint(mazeX, Math.floor(newY / scale));

        // Store wall positions for use when growing/shrinking
        cPlayer.walls = {
            right: hasWallRight,
            bottom: hasWallBottom,
            left: hasWallLeft,
            top: hasWallTop
        };

        const corners = [
            { x: mazeX, y: mazeY }, // Top-left
            { x: Math.floor((newX + currentSize - 1) / scale), y: mazeY }, // Top-right
            { x: mazeX, y: Math.floor((newY + currentSize - 1) / scale) }, // Bottom-left
            { x: Math.floor((newX + currentSize - 1) / scale), y: Math.floor((newY + currentSize - 1) / scale) } // Bottom-right
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
    const currentSize = cPlayer.size;

    // First check if the new position would be within the canvas bounds
    if (newX < 0 || newY < 0 || 
        newX + currentSize > canvas.width || 
        newY + currentSize > canvas.height) {
        return true;
    }

    // For 10x10 player, allow partial movements
    if (currentSize === 10) {
        const dx = newX - cPlayer.x;
        const dy = newY - cPlayer.y;

        // Calculate how far we can move in each direction
        if (dx !== 0) {
            const direction = dx > 0 ? 1 : -1;
            let maxMove = 0;
            
            // Try to move one pixel at a time until we hit a wall
            for (let i = 1; i <= Math.abs(dx); i++) {
                const testX = cPlayer.x + (i * direction);
                let canMove = true;

                // Check if this position would cause a collision
                for (let y = Math.floor(cPlayer.y); y < Math.floor(cPlayer.y + currentSize); y++) {
                    const gridX = Math.floor((testX + (direction > 0 ? currentSize - 1 : 0)) / scale);
                    const gridY = Math.floor(y / scale);
                    if (checkWallAtPoint(gridX, gridY)) {
                        canMove = false;
                        break;
                    }
                }

                if (!canMove) break;
                maxMove = i;
            }

            // If we can move at least one pixel, update the position
            if (maxMove > 0) {
                cPlayer.x += maxMove * direction;
                return false;
            }
        }

        if (dy !== 0) {
            const direction = dy > 0 ? 1 : -1;
            let maxMove = 0;
            
            // Try to move one pixel at a time until we hit a wall
            for (let i = 1; i <= Math.abs(dy); i++) {
                const testY = cPlayer.y + (i * direction);
                let canMove = true;

                // Check if this position would cause a collision
                for (let x = Math.floor(cPlayer.x); x < Math.floor(cPlayer.x + currentSize); x++) {
                    const gridX = Math.floor(x / scale);
                    const gridY = Math.floor((testY + (direction > 0 ? currentSize - 1 : 0)) / scale);
                    if (checkWallAtPoint(gridX, gridY)) {
                        canMove = false;
                        break;
                    }
                }

                if (!canMove) break;
                maxMove = i;
            }

            // If we can move at least one pixel, update the position
            if (maxMove > 0) {
                cPlayer.y += maxMove * direction;
                return false;
            }
        }

        return true; // Return true if we couldn't move at all
    } else {
        // For 20x20 player, check corners as before
        const corners = [
            { x: newX, y: newY }, // Top-left
            { x: newX + currentSize - 1, y: newY }, // Top-right
            { x: newX, y: newY + currentSize - 1 }, // Bottom-left
            { x: newX + currentSize - 1, y: newY + currentSize - 1 } // Bottom-right
        ];

        for (const corner of corners) {
            const gridX = Math.floor(corner.x / scale);
            const gridY = Math.floor(corner.y / scale);
            if (checkWallAtPoint(gridX, gridY)) {
                return true;
            }
        }
    }

    // Store wall information for size changes
    const rightGridPos = Math.floor((newX + currentSize) / scale);
    const bottomGridPos = Math.floor((newY + currentSize) / scale);
    const leftGridPos = Math.floor(newX / scale);
    const topGridPos = Math.floor(newY / scale);

    cPlayer.walls = {
        right: checkWallAtPoint(rightGridPos + 1, Math.floor(newY / scale)),
        bottom: checkWallAtPoint(Math.floor(newX / scale), bottomGridPos + 1),
        left: checkWallAtPoint(leftGridPos - 1, Math.floor(newY / scale)),
        top: checkWallAtPoint(Math.floor(newX / scale), topGridPos - 1)
    };

    return false;
}

function checkWallAtPoint(x, y) {
    const scaledWidth = canvas.width / scale;
    const index = (y * scaledWidth + x) * 4 + 3;
    return mazeData[index] !== 0;
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
    restartCounter.textContent = ''; // Empty instead of '0'
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
  updateControlButtonStyles(); // Add this line

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
      counter.style.color = "#FF6A99";
      counter.style.backgroundColor = "#8A314E";
      counter.style.border = "2px solid #FF6A99";
    } else {
      counter.style.color = "#999999";
      counter.style.backgroundColor = "#222222";
      counter.style.border = "2px solid #999999";
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
  // Handle cave movement
  if (document.getElementById('cavesScreen').style.display === 'flex') {
    // Reset player stun when they press any direction key
    isPlayerStunned = false;
    
    // Allow movement if not currently moving
    if (!isCaveMoving) {
        isCaveMoving = true;
        continuousMove(event.key, () => {
            isCaveMoving = false;
        });
    }
    return;
  }

  // Handle main game movement
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

let isTransitioning = false;

function transitionToSecretLevel(preservedDirection) {
    // Prevent multiple transitions
    if (isTransitioning || currentLevel === "6secret") {
        console.log("Transition blocked:", { isTransitioning, currentLevel }); // Debug log
        return;
    }
    
    console.log("Transitioning to secret level..."); // Debug log
    isTransitioning = true;
    
    // Create and preload new image
    const newImage = new Image();
    newImage.src = 'level6secret.png';
    
    newImage.onload = () => {
        console.log("Secret level image loaded successfully");
        
        // Now that image is loaded, do the transition
        currentLevel = "6secret";
        clearAllTimers();
        
        // Clear canvases
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        
        // Clear all existing gaps
        gaps.length = 0;
        // Remove any existing gap elements from the DOM
        const existingGaps = document.querySelectorAll('.maze-gap');
        existingGaps.forEach(gap => gap.remove());
        
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
        
        // Reset game state
        isExecutingMoves = false;
        isMoving = false;
        moveQueue.length = 0;
        isTrailAnimating = false;
        trailBlocks = [];
        moveCount = 0;
        playerSteps = [];
        trackerList.innerHTML = '';
        
        // Reset spawn protection
        hasLeftSpawnGap = false;
        
        // Check if player has the soul achievement
        const hasSoul = achievementProgress.theSoul.status === "Unlocked";
        
        // Initialize the secret level based on soul achievement
        if (!hasSoul) {
            // First time visit or soul not unlocked - add the key checkpoint
            checkpoints.push({
                x: 340,
                y: 200,
                size: 20,
                touched: false,
                solid: false,
                color: "#00FF00"
            });
        }
        
        // Add the return gap if soul achievement is unlocked
        if (hasSoul) {
            gaps.push({
                level: "6secret",
                x: 0,
                y: 131,
                width: 20,
                height: 20,
                isReturnGap: true,
                color: "rgb(153, 153, 153)"
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
        renderMazeWithGaps(ctx, gaps);
        drawCheckpoints();
        drawPlayer();
        
        // Resume movement in the same direction if provided
        if (preservedDirection && !isMoving && !isExecutingMoves) {
            requestAnimationFrame(() => {
                moveQueue.push(preservedDirection);
                executeMoves();
            });
        }
        
        // Reset transitioning flag after everything is done
        console.log("Transition complete, resetting flag"); // Debug log
        isTransitioning = false;
    };
    
    newImage.onerror = (err) => {
        console.error("Failed to load secret level image:", err);
        isTransitioning = false;
    };
}

function returnToLevelSix() {
    // Prevent multiple transitions
    if (isTransitioning || currentLevel === 6) {
        console.log("Return blocked - resetting flag"); // Debug log
        isTransitioning = false;
        return;
    }
    
    console.log("Returning to level 6...");
    isTransitioning = true;
    
    // Store current movement direction
    const preservedDirection = currentDirection;
    
    // Create and preload new image
    const newImage = new Image();
    newImage.src = 'level6(3).png';
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
        
        // Set correct exit position for level 6 using the start position from stupidLevels
        const exitPos = stupidLevels[5].s;
        console.log("Setting level 6 exit position to:", exitPos);
        exit.x = exitPos.x;
        exit.y = exitPos.y;
        console.log("Exit position after setting:", { x: exit.x, y: exit.y });
        
        // Clear existing gaps
        gaps.length = 0;
        const existingGaps = document.querySelectorAll('.maze-gap');
        existingGaps.forEach(gap => gap.remove());
        
        // Initialize level 6 gaps with proper entrance functionality
        const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
        const gapColor = isEquipped ? "#F96D99" : "rgb(153, 153, 153)";
        
        // Add both the transparent and entrance gaps
        gaps.push({
            level: 6,
            x: 391,
            y: 271,
            width: 31,
            height: 20,
            color: "transparent"
        });
        
        gaps.push({
            level: 6,
            x: 411,
            y: 271,
            width: 11,
            height: 20,
            isEntranceGap: true,
            color: gapColor
        });
        
        // Extract maze data and initialize
        extractMazeData();
        
        // Reset game state
        moveQueue.length = 0;
        currentDirection = preservedDirection;
        isExecutingMoves = false;
        isMoving = false;
        isTrailAnimating = false;
        trailBlocks = [];
        moveCount = 0;
        playerSteps = [];
        trackerList.innerHTML = '';
        
        // Reassign drawExit function without redeclaring
        drawExit = function() {
            ctx.fillStyle = getComputedStyle(document.documentElement)
                .getPropertyValue("--exit-color")
                .trim();
            ctx.fillRect(exit.x, exit.y, exit.size, exit.size);
        };
        
        // Skip level announcement since we're returning to level 6
        
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

        // Reset transitioning flag after everything is done
        console.log("Return complete, resetting flag"); // Debug log
        isTransitioning = false;
    };
    
    newImage.onerror = (err) => {
        console.error("Failed to load level 6 image:", err);
        isTransitioning = false;
    };
}

function updateControlButtonStyles() {
  const isEquipped = localStorage.getItem("isBrainPaletteEquipped") === "true";
  const inGameResetButton = document.getElementById("inGameResetButton");
  const confirmButton = document.getElementById("confirmButton");

  if (inGameResetButton && confirmButton) {
    // Set colors based on brain palette state
    const bgColor = isEquipped ? "#8A314E" : "#222222";
    const textColor = isEquipped ? "#FF6A99" : "#999999";
    const hoverBgColor = isEquipped ? "#F96D99" : "#999999";
    const hoverTextColor = isEquipped ? "#8A314E" : "#222222";
    const borderColor = isEquipped ? "#FF6A99" : "#999999";

    // Update inGameResetButton
    inGameResetButton.style.backgroundColor = bgColor;
    inGameResetButton.style.color = textColor;
    inGameResetButton.style.border = `2px solid ${borderColor}`;
    inGameResetButton.onmouseover = () => {
      inGameResetButton.style.backgroundColor = hoverBgColor;
      inGameResetButton.style.color = hoverTextColor;
    };
    inGameResetButton.onmouseout = () => {
      inGameResetButton.style.backgroundColor = bgColor;
      inGameResetButton.style.color = textColor;
    };

    // Update confirmButton
    confirmButton.style.backgroundColor = bgColor;
    confirmButton.style.color = textColor;
    confirmButton.style.border = `2px solid ${borderColor}`;
    confirmButton.onmouseover = () => {
      confirmButton.style.backgroundColor = hoverBgColor;
      confirmButton.style.color = hoverTextColor;
    };
    confirmButton.onmouseout = () => {
      confirmButton.style.backgroundColor = bgColor;
      confirmButton.style.color = textColor;
    };
  }
}

// Cave system constants
const CAVE_PLAYER_SIZE = 24;
const STEP_SIZE = 24;
const CAVE_WIDTH = 480;
const CAVE_HEIGHT = 4800;
const VISIBLE_HEIGHT = 480;
let cavePlayerX = 240;
let cavePlayerY = 0;
let isCaveMoving = false;
let isGameActive = false;
let caveScrollSpeed = 0.95; // Middle value between 0.5 and 1.5
let isCountdownComplete = false;
let caveScrollInterval = null;

// Wandering block properties
let wanderingX = 216;
let wanderingY = 600; // Starting position
const WANDERING_SPEED = 3;
let wanderingDirection = 'ArrowRight';
let wanderingInterval = null;

// Second wandering block properties
let wandering2X = 336;
let wandering2Y = 1200; // Different starting position
let wandering2Direction = 'ArrowLeft';

// Game namespace and utility classes
window.Game = {};

// Rectangle class for collision and boundary checks
(function() {
    function Rectangle(left, top, width, height) {
        this.left = left || 0;
        this.top = top || 0;
        this.width = width || 0;
        this.height = height || 0;
        this.right = this.left + this.width;
        this.bottom = this.top + this.height;
    }

    Rectangle.prototype.set = function(left, top, width, height) {
        this.left = left;
        this.top = top;
        this.width = width || this.width;
        this.height = height || this.height;
        this.right = this.left + this.width;
        this.bottom = this.top + this.height;
    }

    Rectangle.prototype.within = function(r) {
        return (r.left <= this.left &&
            r.right >= this.right &&
            r.top <= this.top &&
            r.bottom >= this.bottom);
    }

    Rectangle.prototype.overlaps = function(r) {
        return (this.left < r.right &&
            r.left < this.right &&
            this.top < r.bottom &&
            r.top < this.bottom);
    }

    Game.Rectangle = Rectangle;
})();

// Camera class for viewport management
(function() {
    var AXIS = {
        NONE: 1,
        HORIZONTAL: 2,
        VERTICAL: 3,
        BOTH: 4
    };

    function Camera(xView, yView, viewportWidth, viewportHeight, worldWidth, worldHeight) {
        this.xView = xView || 0;
        this.yView = yView || 0;
        this.xDeadZone = 0;
        this.yDeadZone = 0;
        this.wView = viewportWidth;
        this.hView = viewportHeight;
        this.axis = AXIS.BOTH;
        this.followed = null;
        this.viewportRect = new Game.Rectangle(this.xView, this.yView, this.wView, this.hView);
        this.worldRect = new Game.Rectangle(0, 0, worldWidth, worldHeight);
    }

    Camera.prototype.follow = function(gameObject, xDeadZone, yDeadZone) {
        this.followed = gameObject;
        this.xDeadZone = xDeadZone;
        this.yDeadZone = yDeadZone;
    }

    Camera.prototype.update = function() {
        if (this.followed != null) {
            if (this.axis == AXIS.HORIZONTAL || this.axis == AXIS.BOTH) {
                if (this.followed.x - this.xView + this.xDeadZone > this.wView)
                    this.xView = this.followed.x - (this.wView - this.xDeadZone);
                else if (this.followed.x - this.xDeadZone < this.xView)
                    this.xView = this.followed.x - this.xDeadZone;
            }
            if (this.axis == AXIS.VERTICAL || this.axis == AXIS.BOTH) {
                if (this.followed.y - this.yView + this.yDeadZone > this.hView)
                    this.yView = this.followed.y - (this.hView - this.yDeadZone);
                else if (this.followed.y - this.yDeadZone < this.yView)
                    this.yView = this.followed.y - this.yDeadZone;
            }
        }

        this.viewportRect.set(this.xView, this.yView);

        if (!this.viewportRect.within(this.worldRect)) {
            if (this.viewportRect.left < this.worldRect.left)
                this.xView = this.worldRect.left;
            if (this.viewportRect.top < this.worldRect.top)
                this.yView = this.worldRect.top;
            if (this.viewportRect.right > this.worldRect.right)
                this.xView = this.worldRect.right - this.wView;
            if (this.viewportRect.bottom > this.worldRect.bottom)
                this.yView = this.worldRect.bottom - this.hView;
        }
    }

    Game.Camera = Camera;
})();

// Initialize cave camera
const caveCamera = new Game.Camera(
    0, 0,                    // Initial camera position
    CAVE_WIDTH, VISIBLE_HEIGHT,  // Viewport dimensions
    CAVE_WIDTH, CAVE_HEIGHT     // World dimensions
);

// Cave player object for camera to follow
const cavePlayerObj = {
    x: cavePlayerX,
    y: cavePlayerY,
    width: CAVE_PLAYER_SIZE,
    height: CAVE_PLAYER_SIZE
};

// Add at the top with other global variables
let countdownTimeouts = [];

function startCaveCountdown() {
    // Clear any existing timeouts first
    countdownTimeouts.forEach(timeout => clearTimeout(timeout));
    countdownTimeouts = [];

    // Make sure player can't move during countdown
    isGameActive = false;
    isCountdownComplete = false;
    isCaveMoving = false;

    const dotsLabel = document.querySelector('.cave-dots-countdown');
    dotsLabel.innerHTML = '<span class="dot">.</span> <span class="dot">.</span> <span class="dot">.</span>';
    dotsLabel.style.display = 'flex';
    dotsLabel.classList.add('visible');

    // First dot transition
    countdownTimeouts.push(setTimeout(() => {
        dotsLabel.children[0].style.color = '#999999';
        
        // Second dot transition
        countdownTimeouts.push(setTimeout(() => {
            dotsLabel.children[1].style.color = '#999999';
            
            // Third dot transition
            countdownTimeouts.push(setTimeout(() => {
                dotsLabel.children[2].style.color = '#999999';
                
                // Hide dots and enable player movement
                countdownTimeouts.push(setTimeout(() => {
                    dotsLabel.style.display = 'none';
                    isGameActive = true;
                    isCountdownComplete = true;
                    
    setTimeout(() => {
                        if (isGameActive) {
                startCaveScroll();
                        }
                    }, 1500);
                }, 1000));
            }, 1000));
        }, 1000));
    }, 0));
}

function startCaveScroll() {
    if (caveScrollInterval) {
        clearInterval(caveScrollInterval);
    }

    const caveImage = document.getElementById('caveImage');
    let scrollY = 0;
    const fastSpeed = 2; // Fast scroll speed for top 20%
    const normalSpeed = 1.5; // Normal scroll speed
    const slowSpeed = 1; // Slower scroll speed for when player is in bottom half

    caveScrollInterval = setInterval(() => {
        if (!isGameActive) return;

        // Calculate player's position relative to the visible area
        const visualBottom = cavePlayerY - scrollY;
        const middleY = VISIBLE_HEIGHT / 2;
        const topThreshold = VISIBLE_HEIGHT * 0.8; // Top 20% threshold
        
        // Determine scroll speed based on player position
        let currentSpeed;
        if (visualBottom > topThreshold) {
            currentSpeed = fastSpeed; // Fast speed in top 20%
        } else if (visualBottom < middleY) {
            currentSpeed = slowSpeed; // Slow speed in bottom half
        } else {
            currentSpeed = normalSpeed; // Normal speed in middle section
        }

        // Update scroll position, but don't exceed the maximum scroll
        const maxScroll = CAVE_HEIGHT - VISIBLE_HEIGHT;
        scrollY = Math.min(scrollY + currentSpeed, maxScroll);
        caveImage.style.transform = `translateY(${scrollY}px)`;

        // Update all elements that need to move with the scroll
        const cavePlayer = document.getElementById('cavePlayer');
        cavePlayer.style.bottom = `${visualBottom}px`;

        // Update wandering block position
        const wanderingBlock = document.getElementById('wanderingBlock');
        if (wanderingBlock) {
            wanderingBlock.style.bottom = `${wanderingY - scrollY}px`;
        }

        // Update trail block positions
        const trailBlocks = document.querySelectorAll('.trail-block');
        trailBlocks.forEach(block => {
            const blockY = parseInt(block.dataset.y || cavePlayerY);
            block.style.bottom = `${blockY - scrollY}px`;
        });

        // Update checkpoint positions
        CAVE_CHECKPOINTS.forEach((checkpointData, index) => {
            const checkpoint = document.getElementById(`caveCheckpoint${index}`);
            if (checkpoint) {
                checkpoint.style.bottom = `${checkpointData.y - scrollY}px`;
            }
        });

        // Show win block with fade in when reaching the top
        const winBlock = document.getElementById('caveWinBlock');
        if (scrollY >= maxScroll) {
            winBlock.style.opacity = '1';
            winBlock.style.transition = 'opacity 0.5s ease';
        } else {
        winBlock.style.opacity = '0';
        }

        // Update progress bar
        const progress = (scrollY / (CAVE_HEIGHT - VISIBLE_HEIGHT)) * 98;
        const progressFill = document.querySelector('.cave-progress-fill');
        if (progressFill) {
            progressFill.style.setProperty('width', `${Math.min(98, Math.max(0, progress))}%`, 'important');
        }

        // Check if player is below the camera view
        const playerBottomY = cavePlayerY - scrollY;
        if (playerBottomY < -CAVE_PLAYER_SIZE) {
            clearInterval(caveScrollInterval);
            isGameActive = false;
            isCountdownComplete = false;
            showCaveLossPopup();
        }
    }, 16); // ~60fps
}

function showCaveLossPopup() {
    const lossPopup = document.getElementById('caveLossPopup');
    if (lossPopup) {
        lossPopup.style.display = 'block';
        isGameActive = false;
        isCountdownComplete = false;
        
        // Clear any running intervals
        if (caveScrollInterval) {
            clearInterval(caveScrollInterval);
            caveScrollInterval = null;
        }
    }
}


function continuousMove(direction, onComplete) {
    // Don't allow movement if countdown is not complete or player is stunned
    if (!isCountdownComplete || isPlayerStunned) {
        if (onComplete) onComplete();
        return;
    }

    // Reset player stun when they try to move in a new direction
    isPlayerStunned = false;

    const step = 6;
    let newX = cavePlayerX;
    let newY = cavePlayerY;

    switch (direction) {
        case 'ArrowUp':
            newY = cavePlayerY + step;
            break;
        case 'ArrowDown':
            newY = cavePlayerY - step;
            break;
        case 'ArrowLeft':
            newX = cavePlayerX - step;
            break;
        case 'ArrowRight':
            newX = cavePlayerX + step;
            break;
        default:
            return;
    }

    // Check boundaries and collisions
    if (newX < 0 || newX + CAVE_PLAYER_SIZE > CAVE_WIDTH ||
        newY < 0 || newY + CAVE_PLAYER_SIZE > CAVE_HEIGHT ||
        checkCaveCollision(newX, newY)) {
        isCaveMoving = false;
        if (onComplete) onComplete();
        return;
    }

    // Check collision with wandering blocks
    const playerRect = {
        left: newX,
        right: newX + CAVE_PLAYER_SIZE,
        top: newY,
        bottom: newY + CAVE_PLAYER_SIZE
    };

    const block1Rect = {
        left: wanderingX,
        right: wanderingX + CAVE_PLAYER_SIZE,
        top: wanderingY,
        bottom: wanderingY + CAVE_PLAYER_SIZE
    };

    const block2Rect = {
        left: wandering2X,
        right: wandering2X + CAVE_PLAYER_SIZE,
        top: wandering2Y,
        bottom: wandering2Y + CAVE_PLAYER_SIZE
    };

    // If colliding with either wandering block, treat it like a wall
    if ((playerRect.left < block1Rect.right &&
        playerRect.right > block1Rect.left &&
        playerRect.top < block1Rect.bottom &&
        playerRect.bottom > block1Rect.top) ||
        (playerRect.left < block2Rect.right &&
        playerRect.right > block2Rect.left &&
        playerRect.top < block2Rect.bottom &&
        playerRect.bottom > block2Rect.top)) {
        isCaveMoving = false;
        if (onComplete) onComplete();
        return;
    }

    // Get current scroll position
    const caveImage = document.getElementById('caveImage');
    const currentScrollY = parseFloat(caveImage.style.transform.replace('translateY(', '').replace('px)', '') || 0);

    // Update positions
    cavePlayerX = newX;
    cavePlayerY = newY;
    
    // Update player's visual position
    const cavePlayer = document.getElementById('cavePlayer');
    cavePlayer.style.left = `${cavePlayerX}px`;
    cavePlayer.style.bottom = `${cavePlayerY - currentScrollY}px`;

    // Add current position to trail
    caveTrailPositions.push({
        x: cavePlayerX,
        y: cavePlayerY,
        scrollY: currentScrollY
    });

    // Keep only the last CAVE_TRAIL_LENGTH positions
    while (caveTrailPositions.length > CAVE_TRAIL_LENGTH) {
        // Remove the oldest trail block element
        const oldestTrailId = `cave-trail-${caveTrailPositions[0].x}-${caveTrailPositions[0].y}`;
        const oldestTrail = document.getElementById(oldestTrailId);
        if (oldestTrail) {
            oldestTrail.remove();
        }
        caveTrailPositions.shift();
    }

    // Create new trail block
    const cavesScreen = document.getElementById('cavesSquare');
    const trailBlock = document.createElement('div');
    const trailId = `cave-trail-${newX}-${newY}`;
    trailBlock.id = trailId;
    trailBlock.className = 'trail-block';
    trailBlock.style.backgroundColor = '#D1406E';
    trailBlock.style.width = '24px';
    trailBlock.style.height = '24px';
    trailBlock.style.position = 'absolute';
    trailBlock.style.left = `${cavePlayerX}px`;
    
    // Calculate the visual position relative to the current scroll
    const visualBottom = cavePlayerY - currentScrollY;
    trailBlock.style.bottom = `${visualBottom}px`;
    // Store the actual Y position for scrolling updates
    trailBlock.dataset.y = cavePlayerY.toString();
    
    trailBlock.style.opacity = '0.5';
    trailBlock.style.transition = 'opacity 0.5s ease';
    cavesScreen.appendChild(trailBlock);

    // Fade out and remove the trail block
            setTimeout(() => {
        if (trailBlock) {
            trailBlock.style.opacity = '0';
            setTimeout(() => trailBlock.remove(), 500);
        }
    }, 100);

    // Update camera target
    cavePlayerObj.x = cavePlayerX;
    cavePlayerObj.y = cavePlayerY;
    caveCamera.update();

    // Update checkpoint visibility
    updateCaveCheckpoint();

    // Check for win condition
    checkCaveWin();

    // Continue moving in the same direction only if game is active and not stunned
    if (isGameActive && !isPlayerStunned) {
        requestAnimationFrame(() => continuousMove(direction, onComplete));
    } else if (onComplete) {
        onComplete();
    }
}


function showCaveLossPopup() {
    const lossPopup = document.getElementById('caveLossPopup');
    if (lossPopup) {
        lossPopup.style.display = 'block';
        isGameActive = false;
        isCountdownComplete = false;
        isCaveMoving = false;
        
        // Clear any running intervals
        if (caveScrollInterval) {
            clearInterval(caveScrollInterval);
            caveScrollInterval = null;
        }
    }
}

// Create an offscreen canvas for collision detection
const caveCollisionCanvas = document.createElement('canvas');
caveCollisionCanvas.width = CAVE_WIDTH;
caveCollisionCanvas.height = CAVE_HEIGHT;
const caveCollisionCtx = caveCollisionCanvas.getContext('2d', { willReadFrequently: true });
caveCollisionCtx.imageSmoothingEnabled = false; // Disable smoothing for pixel-perfect collision

// Load the cave image for collision detection
const caveCollisionImage = new Image();
caveCollisionImage.src = 'assets/images/cave1(5).png';
caveCollisionImage.onload = function() {
    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CAVE_WIDTH;
    tempCanvas.height = CAVE_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw the collision image for detection
    caveCollisionCtx.drawImage(
        caveCollisionImage,
        0, 0,
        caveCollisionImage.width, caveCollisionImage.height,
        0, 0,
        CAVE_WIDTH, CAVE_HEIGHT
    );

    // Add random dark blocks
    const blockSize = 24;
    const numBlocksX = CAVE_WIDTH / blockSize;
    const numBlocksY = CAVE_HEIGHT / blockSize;
    
    // Store positions of dark blocks
    const darkBlocks1 = []; // For #323232
    const darkBlocks2 = []; // For #1A1A1A
    
    // First pass: identify dark block positions
    for (let y = 0; y < numBlocksY; y++) {
        for (let x = 0; x < numBlocksX; x++) {
            const pixelData = caveCollisionCtx.getImageData(x * blockSize, y * blockSize, 1, 1).data;
            if (pixelData[3] > 0) {
                // 15% chance for first color
                if (Math.random() < 0.15) {
                    darkBlocks1.push({x: x * blockSize, y: y * blockSize});
                }
                // 15% chance for second color (independent of first color)
                if (Math.random() < 0.15) {
                    darkBlocks2.push({x: x * blockSize, y: y * blockSize});
                }
            }
        }
    }
    
    // First pass: draw original black walls
    tempCtx.fillStyle = '#222222';
    for (let y = 0; y < numBlocksY; y++) {
        for (let x = 0; x < numBlocksX; x++) {
            const pixelData = caveCollisionCtx.getImageData(x * blockSize, y * blockSize, 1, 1).data;
            if (pixelData[3] > 0) {
                tempCtx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
            }
        }
    }
    
    // Second pass: draw first set of dark blocks
    tempCtx.fillStyle = '#323232';
    darkBlocks1.forEach(block => {
        tempCtx.fillRect(block.x, block.y, blockSize, blockSize);
    });
    
    // Third pass: draw second set of dark blocks
    tempCtx.fillStyle = '#1A1A1A';
    darkBlocks2.forEach(block => {
        tempCtx.fillRect(block.x, block.y, blockSize, blockSize);
    });
    
    // Create a new image from the canvas
    const newImage = new Image();
    newImage.onload = function() {
        const caveImage = document.getElementById('caveImage');
        caveImage.src = this.src;
    };
    newImage.src = tempCanvas.toDataURL();
};

function checkCaveCollision(x, y) {
    try {
        // Get the pixel data at the player's position
        const pixelData = caveCollisionCtx.getImageData(x, CAVE_HEIGHT - y - CAVE_PLAYER_SIZE, CAVE_PLAYER_SIZE, CAVE_PLAYER_SIZE).data;
        
        // Check if any pixel in the player's area is not fully transparent
        for (let i = 3; i < pixelData.length; i += 4) {
            if (pixelData[i] > 0) { // Alpha channel > 0 means not transparent
                // Add flash effect
                const cavesSquare = document.getElementById('cavesSquare');
                cavesSquare.classList.add('flash');
                setTimeout(() => {
                    cavesSquare.classList.remove('flash');
                }, 50);
                return true; // Collision detected
            }
        }
        return false; // No collision
    } catch (error) {
        console.error('Collision check error:', error);
        return false; // Return false on error to prevent blocking movement
    }
}

function checkCaveWin() {
    // Get player's actual position (accounting for scroll)
    const caveImage = document.getElementById('caveImage');
    const currentScrollY = parseFloat(caveImage.style.transform.replace('translateY(', '').replace('px)', '') || 0);
    const playerActualY = cavePlayerY;
    
    // Get positions for collision check
    const playerRect = {
        left: cavePlayerX,
        right: cavePlayerX + CAVE_PLAYER_SIZE,
        top: playerActualY,
        bottom: playerActualY + CAVE_PLAYER_SIZE
    };
    
    const winBlockRect = {
        left: 216, // Fixed position
        right: 216 + CAVE_PLAYER_SIZE,
        top: CAVE_HEIGHT - CAVE_PLAYER_SIZE, // At the top of the cave map
        bottom: CAVE_HEIGHT
    };
    
    // Check for collision
    if (playerRect.left < winBlockRect.right &&
        playerRect.right > winBlockRect.left &&
        playerRect.top < winBlockRect.bottom &&
        playerRect.bottom > winBlockRect.top) {
        showCaveWinPopup();
    }
}

function showCaveWinPopup() {
    const winPopup = document.getElementById('caveWinPopup');
    if (winPopup) {
        winPopup.style.display = 'block';
        isGameActive = false;
        isCountdownComplete = false;
        isCaveMoving = false;
        
        // Clear any running intervals
        if (caveScrollInterval) {
            clearInterval(caveScrollInterval);
            caveScrollInterval = null;
        }
    }
}

// Add win popup menu button handler
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('caveWinMenuButton').addEventListener('click', function() {
    // Reset everything before leaving
    if (caveScrollInterval) {
        clearInterval(caveScrollInterval);
        caveScrollInterval = null;
    }
    
    // Hide the win popup first
    const winPopup = document.getElementById('caveWinPopup');
    if (winPopup) {
        winPopup.style.display = 'none';
    }
    
    // Show logo container and start screen
    const logoContainer = document.querySelector('.logo-container');
    const startScreen = document.getElementById('startScreen');
    const cavesScreen = document.getElementById('cavesScreen');
    
    // Reset cave state
    resetCaveState();
    
    // First fade out caves screen
    cavesScreen.style.opacity = '0';
    cavesScreen.style.transition = 'opacity 0.5s ease-in-out';
    
    // After a brief delay, show start screen and logo
    setTimeout(() => {
        // Hide caves screen and show start screen
        cavesScreen.style.display = 'none';
        startScreen.style.display = 'flex';
        startScreen.style.opacity = '1';
        startScreen.style.transition = 'opacity 0.5s ease-in-out';
        
        // Show logo container
        if (logoContainer) {
            logoContainer.classList.remove('hidden');
        }
    }, 500);
});
});
// Add win popup reset to resetCaveState

// Change from const to let for caveTrailPositions
let caveTrailPositions = [];
const CAVE_TRAIL_LENGTH = 6;



// Add at the top with other global variables
const CAVE_CHECKPOINTS = [
    {
        x: 216,  // First star
        y: 2360, // Middle of the cave
    size: 24,
    isVisible: true,
        isFound: false,
        symbol: '*',
        message: 'found star1'
    },
    {
        x: 169,  // Second star, left side
        y: 1585, // One third of the cave
        size: 24,
        isVisible: true,
        isFound: false,
        symbol: '*',
        message: 'found star2'
    },
    {
        x: 336,  // Third star, right side
        y: 3200, // Two thirds of the cave
        size: 24,
        isVisible: true,
        isFound: false,
        symbol: '*',
        message: 'found star3'
    }
];

function updateCaveCheckpoint() {
    // Update all checkpoints
    CAVE_CHECKPOINTS.forEach((checkpointData, index) => {
        if (!checkpointData.isFound) {
            const checkpointElement = document.getElementById(`caveCheckpoint${index}`);
            if (!checkpointElement) {
                // Create checkpoint if it doesn't exist
                const newCheckpoint = document.createElement('div');
                newCheckpoint.id = `caveCheckpoint${index}`;
                newCheckpoint.style.cssText = `
                    position: absolute;
                    width: ${checkpointData.size}px;
                    height: ${checkpointData.size}px;
                    left: ${checkpointData.x}px;
                    color: #222222;
                    font-size: 54px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    user-select: none;
                    -webkit-user-drag: none;
                    z-index: 9;
                `;
                newCheckpoint.textContent = checkpointData.symbol;
                document.getElementById('cavesSquare').appendChild(newCheckpoint);
            }

            // Get cave image for scroll position
    const caveImage = document.getElementById('caveImage');
    if (!caveImage || !caveImage.style.transform) return;
    
    const currentScrollY = parseFloat(caveImage.style.transform.replace('translateY(', '').replace('px)', '') || 0);
    
    // Update checkpoint position relative to scroll
            const currentCheckpoint = document.getElementById(`caveCheckpoint${index}`);
            if (currentCheckpoint) {
                currentCheckpoint.style.bottom = `${checkpointData.y - currentScrollY}px`;
            }
    
            // Check for collision with player
        const playerRect = {
            left: cavePlayerX,
            right: cavePlayerX + CAVE_PLAYER_SIZE,
            top: cavePlayerY,
            bottom: cavePlayerY + CAVE_PLAYER_SIZE
        };
        
        const checkpointRect = {
                left: checkpointData.x,
                right: checkpointData.x + checkpointData.size,
                top: checkpointData.y,
                bottom: checkpointData.y + checkpointData.size
            };
            
            // Check for collision
        if (playerRect.left < checkpointRect.right &&
            playerRect.right > checkpointRect.left &&
            playerRect.top < checkpointRect.bottom &&
            playerRect.bottom > checkpointRect.top) {
            // Player found the checkpoint
                console.log(checkpointData.message);
                checkpointData.isFound = true;
                if (currentCheckpoint) {
                    currentCheckpoint.style.opacity = '0';
                }
                
                // Update star counter
                const starElement = document.querySelector(`.cave-star[data-star-index="${index}"]`);
                if (starElement) {
                    starElement.classList.add('collected');
                }
                
                // Flash effect
            const cavesSquare = document.getElementById('cavesSquare');
            cavesSquare.classList.add('flash');
            setTimeout(() => {
                cavesSquare.classList.remove('flash');
            }, 50);
        }
    }
    });
}

function resetCaveState() {
    // Reset game state
    isGameActive = false;
    isCountdownComplete = false;
    isCaveMoving = false;
    isPlayerStunned = false;
    isWanderingBlockStunned = false;
    
    // Reset player position
    cavePlayerX = 240;
    cavePlayerY = 0;
    
    // Clear intervals
    if (caveScrollInterval) {
        clearInterval(caveScrollInterval);
        caveScrollInterval = null;
    }
    if (wanderingInterval) {
        clearInterval(wanderingInterval);
        wanderingInterval = null;
    }
    
    // Reset visual elements
    const cavePlayer = document.getElementById('cavePlayer');
    if (cavePlayer) {
        cavePlayer.style.left = `${cavePlayerX}px`;
        cavePlayer.style.bottom = '0px';
    }
    
    const caveImage = document.getElementById('caveImage');
    if (caveImage) {
        caveImage.style.transform = 'translateY(0px)';
    }
    
    // Remove existing wandering blocks
    const existingWanderingBlock = document.getElementById('wanderingBlock');
    if (existingWanderingBlock) {
        existingWanderingBlock.remove();
    }
    const existingWanderingBlock2 = document.getElementById('wanderingBlock2');
    if (existingWanderingBlock2) {
        existingWanderingBlock2.remove();
    }
    
    // Reset wandering block positions
    wanderingX = 216;
    wanderingY = 600;
    wanderingDirection = 'ArrowRight';
    wandering2X = 336;
    wandering2Y = 1200;
    wandering2Direction = 'ArrowLeft';
    
    // Clear any existing trail blocks
    const trailBlocks = document.querySelectorAll('.trail-block');
    trailBlocks.forEach(block => block.remove());
    caveTrailPositions = [];
    
    // Reset checkpoints
    CAVE_CHECKPOINTS.forEach((checkpoint, index) => {
        checkpoint.isFound = false;
        const starElement = document.querySelector(`.cave-star[data-star-index="${index}"]`);
        if (starElement) {
            starElement.classList.remove('collected');
        }
    });
    
    // Reset progress bar
    const progressFill = document.querySelector('.cave-progress-fill');
    if (progressFill) {
        progressFill.style.setProperty('width', '0%', 'important');
    }
}

function startCaveGame() {
    // Reset everything first
    resetCaveState();
    
    // Create collision bars if they don't exist
    if (!document.getElementById('collisionOuterBar')) {
        createCollisionBars();
    }
    resetCollisionBars();
    
    // Create first wandering block if it doesn't exist
    let wanderingBlock = document.getElementById('wanderingBlock');
    if (!wanderingBlock) {
        wanderingBlock = document.createElement('div');
        wanderingBlock.id = 'wanderingBlock';
        wanderingBlock.style.cssText = `
            position: absolute;
            width: ${CAVE_PLAYER_SIZE}px;
            height: ${CAVE_PLAYER_SIZE}px;
            background-color: #D1406E;
            z-index: 9;
            left: ${wanderingX}px;
            bottom: ${wanderingY}px;
        `;
        document.getElementById('cavesSquare').appendChild(wanderingBlock);
    }

    // Create second wandering block if it doesn't exist
    let wanderingBlock2 = document.getElementById('wanderingBlock2');
    if (!wanderingBlock2) {
        wanderingBlock2 = document.createElement('div');
        wanderingBlock2.id = 'wanderingBlock2';
        wanderingBlock2.style.cssText = `
            position: absolute;
            width: ${CAVE_PLAYER_SIZE}px;
            height: ${CAVE_PLAYER_SIZE}px;
            background-color: #D1406E;
            z-index: 9;
            left: ${wandering2X}px;
            bottom: ${wandering2Y}px;
        `;
        document.getElementById('cavesSquare').appendChild(wanderingBlock2);
    }

    // Start wandering block movement
    clearInterval(wanderingInterval);
    wanderingInterval = setInterval(moveWanderingBlock, 16);

    // Hide win block explicitly
    const winBlock = document.getElementById('caveWinBlock');
    if (winBlock) {
        winBlock.style.opacity = '0';
        winBlock.style.transition = 'none';
        // Re-enable transition after a brief delay
        setTimeout(() => {
            winBlock.style.transition = 'opacity 0.5s ease';
        }, 50);
    }
    
    // Create checkpoint immediately
    updateCaveCheckpoint();
    
    // Start updating checkpoint position with scroll
    const updateCheckpointInterval = setInterval(() => {
        if (isGameActive) {
            updateCaveCheckpoint();
        } else {
            clearInterval(updateCheckpointInterval);
        }
    }, 16);
    
    // Hide loss popup
    const lossPopup = document.getElementById('caveLossPopup');
    if (lossPopup) {
        lossPopup.style.display = 'none';
    }
    
    // Reset progress bar
    const progressFill = document.querySelector('.cave-progress-fill');
    if (progressFill) {
        progressFill.style.transition = 'none';
        progressFill.style.width = '0%';
        setTimeout(() => {
            progressFill.style.transition = '';
        }, 50);
    }
    
    isGameActive = true;
    isCountdownComplete = false;
    isCaveMoving = false;
    
    // Reset all checkpoints
    CAVE_CHECKPOINTS.forEach((checkpointData, index) => {
        checkpointData.isFound = false;
        const currentCheckpoint = document.getElementById(`caveCheckpoint${index}`);
        if (currentCheckpoint) {
            currentCheckpoint.style.opacity = '1';
        }
    });
    
    // Start the countdown sequence
    startCaveCountdown();
}

document.addEventListener('DOMContentLoaded', () => {
    // Add caves button listener
    document.getElementById('cavesButton').addEventListener('click', transitionToCavesScreen);

    // Menu button - exit caves
    document.getElementById('cavesMenuButton').addEventListener('click', () => {
        if (caveScrollInterval) {
            clearInterval(caveScrollInterval);
            caveScrollInterval = null;
        }
        transitionToStartScreen();
    });

    // Loss menu button - exit caves
    document.getElementById('caveLossMenuButton').addEventListener('click', () => {
        if (caveScrollInterval) {
            clearInterval(caveScrollInterval);
            caveScrollInterval = null;
        }
        const lossPopup = document.getElementById('caveLossPopup');
        if (lossPopup) {
            lossPopup.style.display = 'none';
        }
        transitionToStartScreen();
    });

    // Win menu button - exit caves
    document.getElementById('caveWinMenuButton').addEventListener('click', () => {
        if (caveScrollInterval) {
            clearInterval(caveScrollInterval);
            caveScrollInterval = null;
        }
        const winPopup = document.getElementById('caveWinPopup');
        if (winPopup) {
            winPopup.style.display = 'none';
        }
        transitionToStartScreen();
    });
});

// Add this function before the event listeners
function transitionToCavesScreen() {
        const startScreen = document.getElementById('startScreen');
        const cavesScreen = document.getElementById('cavesScreen');
    const winBlock = document.getElementById('caveWinBlock');
        const logoContainer = document.querySelector('.logo-container');
    
    // Hide win block
    if (winBlock) {
        winBlock.style.opacity = '0';
        winBlock.style.transition = 'none';
    }
    
    // Hide logo
        if (logoContainer) {
            logoContainer.classList.add('hidden');
            logoContainer.style.display = 'none';
        }
        
    // Setup caves screen
        cavesScreen.style.display = 'flex';
        cavesScreen.style.opacity = '0';
        
    // Fade out start screen
        startScreen.style.opacity = '0';
        startScreen.style.transition = 'opacity 0.5s ease-in-out';
        
    // After delay, fade in caves screen
        setTimeout(() => {
            cavesScreen.style.opacity = '1';
            cavesScreen.style.transition = 'opacity 0.5s ease-in-out';
            startScreen.style.display = 'none';
            
        // Re-enable win block transition
        if (winBlock) {
            setTimeout(() => {
                winBlock.style.transition = 'opacity 0.5s ease';
            }, 50);
        }
        
        // Start the game
            startCaveGame();
        }, 500);
}

function transitionToStartScreen() {
      const startScreen = document.getElementById('startScreen');
      const cavesScreen = document.getElementById('cavesScreen');
    const logoContainer = document.querySelector('.logo-container');
      
    // Reset cave state first
      resetCaveState();
      
    // Fade out caves screen
    cavesScreen.classList.remove('fade-in');
      cavesScreen.style.opacity = '0';
      cavesScreen.style.transition = 'opacity 0.5s ease-in-out';
      
    // After delay, switch screens
      setTimeout(() => {
        // Hide caves screen
          cavesScreen.style.display = 'none';
        
        // Setup start screen for fade in
          startScreen.style.display = 'flex';
        startScreen.style.opacity = '0';
          startScreen.style.transition = 'opacity 0.5s ease-in-out';
          
        // Show logo
          if (logoContainer) {
              logoContainer.classList.remove('hidden');
              logoContainer.style.display = 'block';
          }
        
        // Force browser to process display change before starting fade
        requestAnimationFrame(() => {
            startScreen.style.opacity = '1';
        });
      }, 500);
}

// Add at the top with other event listeners
window.addEventListener('blur', () => {
    // Clear any pressed keys when window loses focus
    if (isGameActive) {
        isCaveMoving = false;
    }
});

window.addEventListener('focus', () => {
    // Re-enable movement when window gains focus
    if (isGameActive && isCountdownComplete) {
        isCaveMoving = false;
    }
});

// Add this to the DOMContentLoaded event listener
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Clear movement state when tab becomes hidden
        if (isGameActive) {
            isCaveMoving = false;
        }
    } else {
        // Re-enable movement when tab becomes visible
        if (isGameActive && isCountdownComplete) {
            isCaveMoving = false;
        }
    }
});

// Handle intro animation
document.addEventListener('DOMContentLoaded', () => {
    const introScreen = document.getElementById('introScreen');
      const startScreen = document.getElementById('startScreen');
    
    // Show start screen but keep it transparent
    startScreen.style.display = 'flex';
    startScreen.style.opacity = '0';

    // Add shop button event listeners
    const shopButton = document.getElementById('shopButton');
    const shopScreen = document.getElementById('shopScreen');
    const shopBackButton = document.getElementById('shopBackButton');
    const logoContainer = document.querySelector('.logo-container');

    shopButton.addEventListener('click', () => {
        startScreen.style.display = 'none';
        shopScreen.style.display = 'block';
        logoContainer.style.display = 'none';
    });

    shopBackButton.addEventListener('click', () => {
        shopScreen.style.display = 'none';
          startScreen.style.display = 'flex';
        logoContainer.style.display = 'flex';
    });

    // Wait for animation to play (let's say 2 seconds) plus half second delay
    setTimeout(() => {
        // Fade out intro
        introScreen.classList.add('fade-out');
        
        // As intro fades out, fade in the start screen
      setTimeout(() => {
          startScreen.style.opacity = '1';
            introScreen.style.display = 'none';
      }, 500);
    }, 2500); // 2 seconds for animation + 500ms delay
});

// Add these variables at the top with other cave system constants
let isWanderingBlockStunned = false;
let isPlayerStunned = false;
let collisionCounter = 0; // Track number of collisions

function createCollisionBars() {
    // Create outer bar container
    const outerBar = document.createElement('div');
    outerBar.id = 'collisionOuterBar';
    outerBar.style.cssText = `
        position: fixed;
        left: 50%;
        margin-left: -${CAVE_WIDTH / 2 + 70}px;
        top: ${(window.innerHeight - 480) / 2}px;
        width: 60px;
        height: 20px;
        background-color: #999999;
        display: flex;
        gap: 2px;
        padding: 2px;
        z-index: 10;
    `;

    // Create three inner bar segments
    for (let i = 0; i < 3; i++) {
        const innerBar = document.createElement('div');
        innerBar.className = 'collisionInnerBar';
        innerBar.style.cssText = `
            flex: 1;
            background-color: #222222;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        outerBar.appendChild(innerBar);
    }

    // Add to caves screen
    document.getElementById('cavesScreen').appendChild(outerBar);
}

function updateCollisionBars() {
    const innerBars = document.querySelectorAll('.collisionInnerBar');
    innerBars.forEach((bar, index) => {
        bar.style.opacity = index < collisionCounter ? '1' : '0';
    });
}

function resetCollisionBars() {
    collisionCounter = 0;
    updateCollisionBars();
}

function moveBlock(x, y, direction, blockId, updatePosition) {
    let newX = x;
    let newY = y;

    // Randomly change direction occasionally
    if (Math.random() < 0.02) {
        const directions = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        direction = directions[Math.floor(Math.random() * directions.length)];
    }

    // Move in current direction
    switch (direction) {
        case 'ArrowUp':
            newY += WANDERING_SPEED;
            break;
        case 'ArrowDown':
            newY -= WANDERING_SPEED;
            break;
        case 'ArrowLeft':
            newX -= WANDERING_SPEED;
            break;
        case 'ArrowRight':
            newX += WANDERING_SPEED;
            break;
    }

    // Check boundaries and collisions
    if (newX < 0 || newX + CAVE_PLAYER_SIZE > CAVE_WIDTH ||
        newY < 0 || newY + CAVE_PLAYER_SIZE > CAVE_HEIGHT ||
        checkCaveCollision(newX, newY)) {
        // Change to a random different direction when hitting a wall
        const directions = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
            .filter(dir => dir !== direction);
        direction = directions[Math.floor(Math.random() * directions.length)];
        updatePosition(x, y, direction);
        return;
    }

    // Check for collision with player
    const playerRect = {
        left: cavePlayerX,
        right: cavePlayerX + CAVE_PLAYER_SIZE,
        top: cavePlayerY,
        bottom: cavePlayerY + CAVE_PLAYER_SIZE
    };

    const blockRect = {
        left: newX,
        right: newX + CAVE_PLAYER_SIZE,
        top: newY,
        bottom: newY + CAVE_PLAYER_SIZE
    };

    // Check collision with other wandering block
    const otherBlockRect = {
        left: blockId === 'wanderingBlock' ? wandering2X : wanderingX,
        right: blockId === 'wanderingBlock' ? wandering2X + CAVE_PLAYER_SIZE : wanderingX + CAVE_PLAYER_SIZE,
        top: blockId === 'wanderingBlock' ? wandering2Y : wanderingY,
        bottom: blockId === 'wanderingBlock' ? wandering2Y + CAVE_PLAYER_SIZE : wanderingY + CAVE_PLAYER_SIZE
    };

    // If colliding with other block, change direction
    if (blockRect.left < otherBlockRect.right &&
        blockRect.right > otherBlockRect.left &&
        blockRect.top < otherBlockRect.bottom &&
        blockRect.bottom > otherBlockRect.top) {
        // Change to a random different direction
        const directions = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
            .filter(dir => dir !== direction);
        direction = directions[Math.floor(Math.random() * directions.length)];
        updatePosition(x, y, direction);
        return;
    }

    if (playerRect.left < blockRect.right &&
        playerRect.right > blockRect.left &&
        playerRect.top < blockRect.bottom &&
        playerRect.bottom > blockRect.top) {
        // Collision detected - stun both player and block
        isWanderingBlockStunned = true;
        isPlayerStunned = true;

        // Update collision counter
        collisionCounter = (collisionCounter % 3) + 1;
        updateCollisionBars();

        // Unstun the wandering block after 1 second
        setTimeout(() => {
            isWanderingBlockStunned = false;
        }, 1000);

        // Flash effect for collision
        const cavesSquare = document.getElementById('cavesSquare');
        const blockElement = document.getElementById(blockId);
        
        // Store original colors
        const originalCaveColor = cavesSquare.style.backgroundColor;
        const originalBlockColor = blockElement.style.backgroundColor;

        // Flash both elements
        cavesSquare.style.backgroundColor = '#222222';
        blockElement.style.backgroundColor = '#cccccc';

        // Reset colors after 500ms
        setTimeout(() => {
            cavesSquare.style.backgroundColor = originalCaveColor;
            blockElement.style.backgroundColor = originalBlockColor;
        }, 100);

        return;
    }

    // Update position
    updatePosition(newX, newY, direction);

    // Update visual position
    updateBlockVisualPosition(blockId, newX, newY);
}

function moveWanderingBlock() {
    if (!isGameActive) return;

    // Update first block
    if (!isWanderingBlockStunned) {
        moveBlock(wanderingX, wanderingY, wanderingDirection, 'wanderingBlock', (newX, newY, newDir) => {
    wanderingX = newX;
    wanderingY = newY;
            wanderingDirection = newDir;
        });
    } else {
        // Even when stunned, update visual position for scrolling
        updateBlockVisualPosition('wanderingBlock', wanderingX, wanderingY);
    }

    // Update second block
    if (!isWanderingBlockStunned) {
        moveBlock(wandering2X, wandering2Y, wandering2Direction, 'wanderingBlock2', (newX, newY, newDir) => {
            wandering2X = newX;
            wandering2Y = newY;
            wandering2Direction = newDir;
        });
    } else {
        // Even when stunned, update visual position for scrolling
        updateBlockVisualPosition('wanderingBlock2', wandering2X, wandering2Y);
    }
}

function updateBlockVisualPosition(blockId, x, y) {
    const blockElement = document.getElementById(blockId);
    if (blockElement) {
        const currentScrollY = parseFloat(document.getElementById('caveImage').style.transform.replace('translateY(', '').replace('px)', '') || 0);
        blockElement.style.left = `${x}px`;
        blockElement.style.bottom = `${y - currentScrollY}px`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const shopText = document.getElementById('shopText');
    const inventoryText = document.getElementById('inventoryText');
    const shopContent = document.getElementById('shopContent');
    const inventoryContent = document.getElementById('inventoryContent');
    const shopIndicator = shopText.querySelector('.indicator');
    const inventoryIndicator = inventoryText.querySelector('.indicator');

    shopText.addEventListener('click', function() {
        shopContent.style.display = 'block';
        inventoryContent.style.display = 'none';
        shopIndicator.style.display = 'inline';
        inventoryIndicator.style.display = 'none';
    });

    inventoryText.addEventListener('click', function() {
        shopContent.style.display = 'none';
        inventoryContent.style.display = 'block';
        shopIndicator.style.display = 'none';
        inventoryIndicator.style.display = 'inline';
    });
});

// Add the messages array and current message index
const shopkeepMessages = [
    '"most of these are expired,\n    but im sure they get the job done"',
    '"yea the prices ain\'t fair but\n    ... in life, nothing is"',
    '"we got a second-hand section btw\n    cuz we care bout the environment"'
];
let currentMessageIndex = 0;

// Add a variable to track the typing timeout
let currentTypingTimeout;
let currentShopkeeperAnimation;

function typeShopkeepText(text, speed = 50) {
    const shopkeepText = document.getElementById('shopkeepText');
    const shopkeepImg = document.querySelector('#shopWindow img');
    const okButton = document.getElementById('shopkeepOkButton');
    
    // Clear any ongoing typing animation
    if (currentTypingTimeout) {
        clearTimeout(currentTypingTimeout);
    }
    
    // Clear any ongoing shopkeeper animation
    if (currentShopkeeperAnimation) {
        clearInterval(currentShopkeeperAnimation);
    }
    
    // Clear existing text immediately
    shopkeepText.innerHTML = '';
    okButton.disabled = true;
    okButton.style.opacity = '0.5';
    okButton.style.cursor = 'default';
    
    let i = 0;
    let isFrame2 = false;
    
    // Start the shopkeeper animation
    currentShopkeeperAnimation = setInterval(() => {
        isFrame2 = !isFrame2;
        shopkeepImg.src = isFrame2 ? 'assets/images/shopkeep2.png' : 'assets/images/shopkeep1.png';
    }, 150);
    
    function type() {
        if (i < text.length) {
            if (text[i] === '\n') {
                shopkeepText.innerHTML += '<br>&nbsp;&nbsp;&nbsp;&nbsp;';
            } else {
                shopkeepText.innerHTML += text[i];
            }
            i++;
            currentTypingTimeout = setTimeout(type, speed);
        } else {
            // Stop animation and reset to default frame when typing is done
            clearInterval(currentShopkeeperAnimation);
            shopkeepImg.src = 'assets/images/shopkeep1.png';
            // Enable the button and restore opacity
            okButton.disabled = false;
            okButton.style.opacity = '1';
            okButton.style.cursor = 'pointer';
            currentTypingTimeout = null;
            currentShopkeeperAnimation = null;
        }
    }
    type();
}

// Add event listener for shop button
document.getElementById('shopButton').addEventListener('click', function() {
    document.getElementById('shopScreen').style.display = 'block';
    currentMessageIndex = 0; // Reset to first message
    typeShopkeepText(shopkeepMessages[currentMessageIndex]);
});

// Add event listener for the OK button
document.getElementById('shopkeepOkButton').addEventListener('click', function() {
    if (this.disabled) return; // Extra safety check
    currentMessageIndex = (currentMessageIndex + 1) % shopkeepMessages.length;
    typeShopkeepText(shopkeepMessages[currentMessageIndex]);
});

// Add event listener for the level 9 menu button
document.getElementById('menuButtonPopup').addEventListener('click', function() {
    // Hide the win popup
    document.getElementById('winPopup').style.display = 'none';
    // Show level selector
    showLevelSelector();
    // Show the gold coin notification and overlay only if it's the first completion
    if (localStorage.getItem('hasGoldCoin') !== 'true') {
        document.getElementById('darkOverlay').style.display = 'block';
        document.getElementById('goldCoinNotification').style.display = 'block';
        // Disable all buttons in the level selector
        const buttons = document.querySelectorAll('#levelSelector button');
        buttons.forEach(button => {
            button.style.pointerEvents = 'none';
        });
    }
});

// Add event listener for the notification close button
document.querySelector('#goldCoinNotification button').addEventListener('click', function() {
    document.getElementById('goldCoinNotification').style.display = 'none';
    document.getElementById('darkOverlay').style.display = 'none';
    // Re-enable level selector buttons
    document.querySelectorAll('#levelSelector button, #levelSelector img').forEach(el => {
        el.style.pointerEvents = 'auto';
    });
    localStorage.setItem('hasGoldCoin', 'true');
    
    // Update The Body achievement
    achievementProgress.theBody = {
        progress: 100,
        status: "Unlocked"
    };
    saveAchievementProgress();
    
    // Update achievement UI
    const progressFill = document.querySelector(".progressFill.theBody");
    const progressPercentage = document.querySelector(".progressPercentage.theBody");
    const achievementStatus = document.querySelector(".achievementStatus.theBody");
    
    if (progressFill) progressFill.style.width = "100%";
    if (progressPercentage) progressPercentage.textContent = "100%";
    if (achievementStatus) achievementStatus.innerHTML = "Unlocked<br>Body Palette";
    
    updateInventoryDisplay();
});

// Add this function to handle inventory updates
function updateInventoryDisplay() {
    const emptyText = document.getElementById('emptyInventoryText');
    const goldCoinItem = document.getElementById('goldCoinItem');
    const hasGoldCoin = localStorage.getItem('hasGoldCoin') === 'true';
    const hasMiniaturizer = localStorage.getItem('hasMiniaturizer') === 'true';

    // Create or get miniaturizer inventory item
    let miniaturizerInventoryItem = document.getElementById('miniaturizerInventoryItem');
    if (!miniaturizerInventoryItem && hasMiniaturizer) {
        miniaturizerInventoryItem = document.createElement('div');
        miniaturizerInventoryItem.id = 'miniaturizerInventoryItem';
        miniaturizerInventoryItem.style.position = 'absolute';
        miniaturizerInventoryItem.style.top = '50px';
        miniaturizerInventoryItem.style.left = '50px';  // Position it next to the gold coin

        const iconDiv = document.createElement('div');
        iconDiv.style.width = '100px';
        iconDiv.style.height = '100px';
        iconDiv.style.backgroundColor = '#D1D1D1';
        iconDiv.style.margin = '0 auto';

        const textDiv = document.createElement('div');
        textDiv.style.color = '#D1D1D1';
        textDiv.style.fontFamily = 'BIZUDMincho';
        textDiv.style.fontSize = '24px';
        textDiv.style.marginTop = '10px';
        textDiv.style.textAlign = 'center';
        textDiv.style.width = '200px';
        textDiv.style.marginLeft = '0px';
        textDiv.textContent = 'the miniaturizer';

        miniaturizerInventoryItem.appendChild(iconDiv);
        miniaturizerInventoryItem.appendChild(textDiv);
        document.getElementById('inventoryContent').appendChild(miniaturizerInventoryItem);
    }

    if (hasGoldCoin || hasMiniaturizer) {
        emptyText.style.display = 'none';
        if (goldCoinItem) {
            goldCoinItem.style.display = hasGoldCoin ? 'block' : 'none';
        }
        if (miniaturizerInventoryItem) {
            miniaturizerInventoryItem.style.display = hasMiniaturizer ? 'block' : 'none';
        }
    } else {
        emptyText.style.display = 'block';
        if (goldCoinItem) {
        goldCoinItem.style.display = 'none';
        }
        if (miniaturizerInventoryItem) {
            miniaturizerInventoryItem.style.display = 'none';
        }
    }
}

// Add event listener for inventory tab click
document.getElementById('inventoryText').addEventListener('click', function() {
    document.getElementById('shopContent').style.display = 'none';
    document.getElementById('inventoryContent').style.display = 'block';
    document.querySelector('#shopText .indicator').style.display = 'none';
    document.querySelector('#inventoryText .indicator').style.display = 'inline';
    updateInventoryDisplay();
});

// Add function to stop music when returning to menu
function returnToMainMenu() {
    document.getElementById("levelSelection").style.display = "none";
    document.getElementById("startScreen").style.display = "flex";
    document.getElementById("gameContainer").style.display = "none";
    
    // Stop the background music
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    
    // Reset the timer display
    document.getElementById("timerDisplay").textContent = "Time: 00:00";
    stopTimer();
}

// Update the mainMenuButton click handler
document.getElementById("mainMenuButton").addEventListener("click", returnToMainMenu);

// Also stop music when clicking menu button during gameplay
document.getElementById("menuButton").addEventListener("click", () => {
    showLevelSelector();
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
});

// Initialize shadow trail canvas
let shadowTrailCanvas;
let shadowTrailCtx;

document.addEventListener("DOMContentLoaded", () => {
    shadowTrailCanvas = document.getElementById("shadowTrailCanvas");
    shadowTrailCtx = shadowTrailCanvas.getContext("2d");
    shadowTrailCanvas.width = mazeCanvas.width;
    shadowTrailCanvas.height = mazeCanvas.height;
    shadowTrailCtx.fillStyle = "#222222";
});

document.addEventListener("DOMContentLoaded", () => {
    // Shop item detail view handlers
    const miniaturizerItem = document.getElementById("miniaturizerItem");
    const miniaturizerTitle = miniaturizerItem.querySelector("div:last-child");
    const shopDetailWindow = document.getElementById("shopDetailWindow");
    const closeDetailButton = document.getElementById("closeDetailButton");
    let hasTraded = false;

    // Check if miniaturizer was already bought
    const isMiniaturizerBought = localStorage.getItem('isMiniaturizerBought') === 'true';
    if (isMiniaturizerBought) {
        miniaturizerItem.style.display = 'none';
    }

    function updateMiniaturizerDetails() {
        const detailsContainer = shopDetailWindow.querySelector('div');
        const hasGoldCoin = localStorage.getItem('hasGoldCoin') === 'true';
        
        // Remove existing trade button or done text if they exist
        const existingTradeButton = detailsContainer.querySelector('#tradeButton');
        const existingDoneText = detailsContainer.querySelector('#doneText');
        if (existingTradeButton) {
            existingTradeButton.remove();
        }
        if (existingDoneText) {
            existingDoneText.remove();
        }

        // Add trade button if player has gold coin and hasn't traded
        if (hasGoldCoin && !hasTraded) {
            const tradeButton = document.createElement('button');
            tradeButton.id = 'tradeButton';
            tradeButton.textContent = 'trade for gold coin';
            tradeButton.style.backgroundColor = '#D1D1D1';
            tradeButton.style.color = '#111111';
            tradeButton.style.border = 'none';
            tradeButton.style.padding = '5px 15px';
            tradeButton.style.fontFamily = 'BIZUDMincho';
            tradeButton.style.fontSize = '18px';
            tradeButton.style.cursor = 'pointer';
            tradeButton.style.marginTop = '20px';
            tradeButton.style.transition = 'all 0.2s ease';

            tradeButton.addEventListener('mouseover', () => {
                tradeButton.style.backgroundColor = '#111111';
                tradeButton.style.color = '#D1D1D1';
            });

            tradeButton.addEventListener('mouseout', () => {
                tradeButton.style.backgroundColor = '#D1D1D1';
                tradeButton.style.color = '#111111';
            });

            tradeButton.addEventListener('click', () => {
                hasTraded = true;
                tradeButton.remove();
                
                const doneText = document.createElement('div');
                doneText.id = 'doneText';
                doneText.textContent = 'done';
                doneText.style.color = '#D1D1D1';
                doneText.style.fontFamily = 'BIZUDMincho';
                doneText.style.fontSize = '18px';
                doneText.style.marginTop = '20px';
                detailsContainer.appendChild(doneText);
            });

            detailsContainer.appendChild(tradeButton);
        } else if (hasTraded) {
            const doneText = document.createElement('div');
            doneText.id = 'doneText';
            doneText.textContent = 'done';
            doneText.style.color = '#D1D1D1';
            doneText.style.fontFamily = 'BIZUDMincho';
            doneText.style.fontSize = '18px';
            doneText.style.marginTop = '20px';
            detailsContainer.appendChild(doneText);
        }
    }

    miniaturizerItem.addEventListener("click", () => {
        shopDetailWindow.style.display = "block";
        miniaturizerTitle.style.textDecoration = "underline";
        // Interrupt any ongoing typing and start new text
        typeShopkeepText('"you could probably use that to get into tight spaces"');
        updateMiniaturizerDetails();
    });

    closeDetailButton.addEventListener("click", () => {
        shopDetailWindow.style.display = "none";
        miniaturizerTitle.style.textDecoration = "none";
        // Interrupt any ongoing typing and reset to default text
        typeShopkeepText('"welcome to my shop! take a look around..."');
        
        // If trade happened, update inventories
        if (hasTraded) {
            // Remove gold coin from inventory
            localStorage.setItem('hasGoldCoin', 'false');
            // Add miniaturizer to inventory
            localStorage.setItem('hasMiniaturizer', 'true');
            // Mark miniaturizer as bought
            localStorage.setItem('isMiniaturizerBought', 'true');
            // Hide miniaturizer from shop
            miniaturizerItem.style.display = 'none';
            // Update inventory display
            updateInventoryDisplay();
        }
    });

    // Add hover effect for close button
    closeDetailButton.addEventListener("mouseover", () => {
        closeDetailButton.style.backgroundColor = "#111111";
        closeDetailButton.style.color = "#D1D1D1";
    });

    closeDetailButton.addEventListener("mouseout", () => {
        closeDetailButton.style.backgroundColor = "#D1D1D1";
        closeDetailButton.style.color = "#111111";
    });
});

document.getElementById("shopBackButton").addEventListener("click", () => {
    // Reset shop state
    document.getElementById("shopContent").style.display = "block";
    document.getElementById("inventoryContent").style.display = "none";
    document.getElementById("shopDetailWindow").style.display = "none";
    document.querySelector("#shopText .indicator").style.display = "inline";
    document.querySelector("#inventoryText .indicator").style.display = "none";
    
    // Hide shop screen
    document.getElementById("shopScreen").style.display = "none";
    document.getElementById("startScreen").style.display = "flex";
});

// Update shop button click handler
document.getElementById("shopButton").addEventListener("click", () => {
    // Show shop screen with default state
    document.getElementById("shopScreen").style.display = "block";
    document.getElementById("startScreen").style.display = "none";
    
    // Reset to default shop view
    document.getElementById("shopContent").style.display = "block";
    document.getElementById("inventoryContent").style.display = "none";
    document.getElementById("shopDetailWindow").style.display = "none";
    document.querySelector("#shopText .indicator").style.display = "inline";
    document.querySelector("#inventoryText .indicator").style.display = "none";
});

// Add variables to track bar state
let isBarAnimating = false;
let barRefillInterval = null;

// Store the original drawPlayer function
const originalDrawPlayer = drawPlayer;

// Store and modify the recolorMaze function
const originalRecolorMaze = recolorMaze;
recolorMaze = function() {
    // First call the original function to draw everything normally
    originalRecolorMaze();
    
    // Always redraw the player with current size
    const ctx = mazeCanvas.getContext('2d');
    
    // Clear just the player's cell
    ctx.clearRect(
        player.x,
        player.y,
        player.size,
        player.size
    );
    
    // Draw player with current size, always aligned to top left
    ctx.fillStyle = '#222222';
    ctx.fillRect(
        player.x,
        player.y,
        player.size,
        player.size
    );
};

// Add key press handler for 'X'
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'x' && !isBarAnimating) {
        // Check if player has the miniaturizer
        const hasMiniaturizer = localStorage.getItem('hasMiniaturizer') === 'true';
        if (!hasMiniaturizer) {
            // Show error message if player doesn't have the miniaturizer
            showErrorPopup();
            playErrorSound();
            return;
        }

        const innerBar = document.getElementById('innerBar');
        if (!innerBar) return;

        isBarAnimating = true;
        const originalHeight = 296; // Original height of inner bar
        const drainDuration = 4000; // 2 seconds
        const refillDuration = 3000; // 30 seconds

        // Try to shrink player
        if (!updatePlayerSize(10)) {
            // If shrinking fails due to collision, abort
            isBarAnimating = false;
            return;
        }

        // Drain animation
        const drainStartTime = performance.now();
        
        function drainAnimation(currentTime) {
            const elapsed = currentTime - drainStartTime;
            const progress = Math.min(elapsed / drainDuration, 1);
            
            const newHeight = originalHeight * (1 - progress);
            innerBar.style.height = `${newHeight}px`;
            innerBar.style.top = `${2 + (originalHeight - newHeight)}px`;
            
            if (progress < 1) {
                requestAnimationFrame(drainAnimation);
            } else {
                // Reset position for refill and set half opacity
                innerBar.style.top = '2px';
                innerBar.style.height = '0px';
                innerBar.style.opacity = '0.5';
                
                updatePlayerSize(20);
                
                // Start refill animation
                const refillStartTime = performance.now();
                
                function refillAnimation(currentTime) {
                    const elapsed = currentTime - refillStartTime;
                    const progress = Math.min(elapsed / refillDuration, 1);
                    
                    const newHeight = originalHeight * progress;
                    innerBar.style.height = `${newHeight}px`;
                    
                    if (progress < 1) {
                        requestAnimationFrame(refillAnimation);
                    } else {
                        // Restore full opacity when fully charged
                        innerBar.style.opacity = '1';
                        isBarAnimating = false;
                    }
                }
                
                requestAnimationFrame(refillAnimation);
            }
        }

        requestAnimationFrame(drainAnimation);
    }
});

function updatePlayerSize(newSize) {
    const oldSize = player.size;
    const oldX = player.x;
    const oldY = player.y;

    // Calculate the center point of the player
    const centerX = oldX + oldSize / 2;
    const centerY = oldY + oldSize / 2;

    // Calculate new position to maintain center point
    let newX = centerX - newSize / 2;
    let newY = centerY - newSize / 2;

    // Temporarily update size for collision check
    const tempSize = player.size;
    player.size = newSize;

    // Check if new centered position would cause collision
    if (isCollision(newX, newY, player)) {
        // If centered position collides, try to adjust position
        // Try to maintain current alignment if possible
        if (!isCollision(oldX, oldY, player)) {
            newX = oldX;
            newY = oldY;
        } else {
            // Revert changes if no valid position found
            player.size = tempSize;
        return false;
        }
    }

    // Apply the changes
    player.x = newX;
    player.y = newY;
    player.size = newSize;
    player.visualSize = newSize;
    
    recolorMaze();
    return true;
}

// Add this variable at the top of the file with other globals
let lastValidBigPosition = null;

function updatePlayerSize(newSize) {
    const oldSize = player.size;
    const oldX = player.x;
    const oldY = player.y;

    // If we're going from small to big (10 to 20)
    if (oldSize === 10 && newSize === 20) {
        // Check if we can grow at current position
        const canGrowHere = canGrowAtPosition(player.x, player.y, newSize);
        
        if (!canGrowHere && lastValidBigPosition) {
            // Only teleport back if we really can't grow here
            const canGrowAnywhere = false;
            // Try slightly adjusted positions
            for (let offsetX = -5; offsetX <= 5 && !canGrowAnywhere; offsetX++) {
                for (let offsetY = -5; offsetY <= 5; offsetY++) {
                    if (canGrowAtPosition(player.x + offsetX, player.y + offsetY, newSize)) {
                        player.x += offsetX;
                        player.y += offsetY;
                        player.size = newSize;
                        player.visualSize = newSize;
                        // Update collision state for new size and position
                        checkStandardCollisions(player.x, player.y, player);
                        recolorMaze();
                        return true;
                    }
                }
            }
            // If we really can't grow nearby, teleport back
            player.x = lastValidBigPosition.x;
            player.y = lastValidBigPosition.y;
            player.size = newSize;
        } else if (!canGrowHere) {
            // If we can't grow and don't have a last position, stay small
        return false;
        } else {
            // We can grow here
            player.size = newSize;
        }
    } else if (oldSize === 20 && newSize === 10) {
        // Save current position as last valid big position before shrinking
        lastValidBigPosition = { x: player.x, y: player.y };
        
        // Center the small player in the space of the big player
        player.x = oldX + (oldSize - newSize) / 2;
        player.y = oldY + (oldSize - newSize) / 2;
        player.size = newSize;
    }

    player.visualSize = player.size;
    // Update collision state for new size
    checkStandardCollisions(player.x, player.y, player);
    recolorMaze();
    return true;
}

function canGrowAtPosition(x, y, newSize) {
    // First try the exact position
    const startGridX = Math.floor(x / scale);
    const endGridX = Math.floor((x + newSize - 1) / scale);
    const startGridY = Math.floor(y / scale);
    const endGridY = Math.floor((y + newSize - 1) / scale);

    // Try exact position first
    let hasWall = false;
    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
        for (let gridY = startGridY; gridY <= endGridY; gridY++) {
            if (checkWallAtPoint(gridX, gridY)) {
                hasWall = true;
                break;
            }
        }
        if (hasWall) break;
    }
    
    if (!hasWall) return true;

    // If exact position doesn't work, try aligning with nearby walls
    for (let offsetX = -10; offsetX <= 10; offsetX++) {
        for (let offsetY = -10; offsetY <= 10; offsetY++) {
            const testX = x + offsetX;
            const testY = y + offsetY;
            
            // Skip if this would put us out of bounds
            if (testX < 0 || testY < 0 || 
                testX + newSize > canvas.width || 
                testY + newSize > canvas.height) {
                continue;
            }

            // Check if this position aligns with grid
            if (testX % scale === 0 || testY % scale === 0) {
                let validPosition = true;
                const newStartGridX = Math.floor(testX / scale);
                const newEndGridX = Math.floor((testX + newSize - 1) / scale);
                const newStartGridY = Math.floor(testY / scale);
                const newEndGridY = Math.floor((testY + newSize - 1) / scale);

                for (let gridX = newStartGridX; gridX <= newEndGridX; gridX++) {
                    for (let gridY = newStartGridY; gridY <= newEndGridY; gridY++) {
                        if (checkWallAtPoint(gridX, gridY)) {
                            validPosition = false;
                            break;
                        }
                    }
                    if (!validPosition) break;
                }

                if (validPosition) {
                    // Update the player's position since we found a valid spot
                    player.x = testX;
                    player.y = testY;
                    return true;
                }
            }
        }
    }
    return false;
}