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
  const backgroundMusic = new Audio("./assets/audio/i careOST.mp3"); // Background music
  const volumeSlider = document.getElementById("volumeSlider"); // Slider
  const volumeValueDisplay = document.getElementById("volumeValue"); // Display value
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

  // Reset all progress bars to 0
  if (brainProgressFill) brainProgressFill.style.width = '0%';
  if (tailProgressFill) tailProgressFill.style.width = '0%';
  if (soulProgressFill) soulProgressFill.style.width = '0%';
  if (brainProgressPercentage) brainProgressPercentage.textContent = '0%';
  if (tailProgressPercentage) tailProgressPercentage.textContent = '0%';
  if (soulProgressPercentage) soulProgressPercentage.textContent = '0%';

  // Animate Brain progress
  if (brainProgressFill && achievementProgress.theBrain) {
    animateProgressUpdate(
      achievementProgress.theBrain.progress,
      (progress) => {
        brainProgressFill.style.width = `${progress}%`;
        brainProgressPercentage.textContent = `${progress}%`;
      },
      () => {
          brainAchievementStatus.textContent = achievementProgress.theBrain.status;
      }
    );
  }

  // Animate Tail progress
  if (tailProgressFill && achievementProgress.theTail) {
    animateProgressUpdate(
      achievementProgress.theTail.progress,
      (progress) => {
        tailProgressFill.style.width = `${progress}%`;
        tailProgressPercentage.textContent = `${progress}%`;
      },
      () => {
          tailAchievementStatus.textContent = achievementProgress.theTail.status;
      }
    );
  }

  // Animate Soul progress
  if (soulProgressFill && achievementProgress.theSoul) {
    animateProgressUpdate(
      achievementProgress.theSoul.progress,
      (progress) => {
        soulProgressFill.style.width = `${progress}%`;
        soulProgressPercentage.textContent = `${progress}%`;
      },
      () => {
        soulAchievementStatus.textContent = achievementProgress.theSoul.status;
      }
    );
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
  }
};

function loadAchievementProgress() {
  const savedProgress = localStorage.getItem('achievementProgress');
  if (savedProgress) {
    const parsed = JSON.parse(savedProgress);
    achievementProgress = {
      theBrain: {
        progress: parsed.theBrain?.progress || 0,
        status: parsed.theBrain?.status || "Locked"
      },
      theTail: {
        progress: parsed.theTail?.progress || 0,
        status: parsed.theTail?.status || "Locked"
      },
      theSoul: {
        progress: parsed.theSoul?.progress || 0,
        status: parsed.theSoul?.status || "Locked"
      }
    };
  }
  console.log("Loaded achievement progress:", achievementProgress);
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

// Save achievement progress
function saveAchievementProgress() {
    saveData('achievementProgress', achievementProgress);
    updateAchievementDisplay();
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

  // Reset all progress bars to 0
  if (brainProgressFill) brainProgressFill.style.width = '0%';
  if (tailProgressFill) tailProgressFill.style.width = '0%';
  if (soulProgressFill) soulProgressFill.style.width = '0%';
  if (brainProgressPercentage) brainProgressPercentage.textContent = '0%';
  if (tailProgressPercentage) tailProgressPercentage.textContent = '0%';
  if (soulProgressPercentage) soulProgressPercentage.textContent = '0%';

  // Animate Brain progress
  if (brainProgressFill && achievementProgress.theBrain) {
    animateProgressUpdate(
      achievementProgress.theBrain.progress,
      (progress) => {
        brainProgressFill.style.width = `${progress}%`;
        brainProgressPercentage.textContent = `${progress}%`;
      },
      () => {
    brainAchievementStatus.textContent = achievementProgress.theBrain.status;
      }
    );
  }

  // Animate Tail progress
  if (tailProgressFill && achievementProgress.theTail) {
    animateProgressUpdate(
      achievementProgress.theTail.progress,
      (progress) => {
        tailProgressFill.style.width = `${progress}%`;
        tailProgressPercentage.textContent = `${progress}%`;
      },
      () => {
    tailAchievementStatus.textContent = achievementProgress.theTail.status;
      }
    );
  }

  // Animate Soul progress
  if (soulProgressFill && achievementProgress.theSoul) {
    animateProgressUpdate(
      achievementProgress.theSoul.progress,
      (progress) => {
        soulProgressFill.style.width = `${progress}%`;
        soulProgressPercentage.textContent = `${progress}%`;
      },
      () => {
        soulAchievementStatus.textContent = achievementProgress.theSoul.status;
      }
    );
  }
}

unlockablesButton.addEventListener('click', () => {
  updateUnlockablesUI();
  const unlockablesCenterWindow = document.getElementById('unlockablesCenterWindow');
  unlockablesCenterWindow.scrollTop = 0; // Reset scroll position to top
  unlockablesScreen.style.display = 'flex';
});

unlockablesBackButton.addEventListener('click', () => {
  unlockablesScreen.style.display = 'none';
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
    let shouldRedraw = false;

    checkpoints.forEach((checkpoint, index) => {
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
            // For level 9, handle the checkpoint becoming solid
            if (isPlayerOnCheckpoint && !checkpoint.touched) {
                checkpoint.touched = true;
                shouldRedraw = true;
            } else if (checkpoint.touched && !checkpoint.solid && !isPlayerOnCheckpoint) {
                // If player has touched the checkpoint and is no longer on it, make it solid
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
    unlockablesWrapper.style.paddingTop = '20px';
    
    // Append unlockables in order
    unlockedItems.forEach(item => {
      unlockablesWrapper.appendChild(item.element);
    });
    
    unlockablesCenterWindow.appendChild(unlockablesWrapper);
    
    // Reset scroll position after a short delay to ensure DOM is updated
    requestAnimationFrame(() => {
      unlockablesCenterWindow.scrollTop = 0;
    });
  }

  if (!hasUnlockables) {
    unlockablesCenterWindow.innerHTML = "nothing here... for now";
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
  unlockable.style.padding = "20px 0";
      unlockable.style.backgroundColor = "#222222";
      unlockable.style.color = "#CCCCCC";
  unlockable.style.minHeight = "240px";

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
  unlockable.style.padding = "20px 0";
  unlockable.style.backgroundColor = "#222222";
  unlockable.style.color = "#CCCCCC";
  unlockable.style.minHeight = "240px";

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
  unlockable.style.padding = "20px 0";
  unlockable.style.backgroundColor = "#222222";
  unlockable.style.color = "#CCCCCC";
  unlockable.style.minHeight = "240px";

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
    theSoul: {
      title: "The Soul",
      progress: 0,
      status: "Locked"
    }
  };

  // Reset level 8 paths
  localStorage.setItem('level8Paths', JSON.stringify({"first": false, "second": false}));

  // Save updated achievements to localStorage or file
  saveAchievementProgress();

  // Update UI
  updateAchievementUIAnimated();

  // Reset unlockables UI
  resetUnlockables();
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

function saveAchievementProgress() {
    saveData('achievementProgress', achievementProgress);
}

function loadAchievementProgress() {
    const progress = loadData('achievementProgress');
    if (progress) {
        achievementProgress = progress;
        updateAchievementDisplay();
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
        } else if (currentLevel === 7) {
            initializeLevel7Blocks();
        } else if (currentLevel === 8) {
            initializeCheckpoints();
            console.log("Checkpoint initialized for level 8:", checkpoints);
        }

        // Initial draw of all elements
        recolorMaze();
        
        if (currentLevel === 6) {
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

        // Display the win popup
        winPopup.style.display = "block";
        const moveCountMessage = document.getElementById("moveCountMessage");
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

    // Clear the restart counter
    const restartCounter = document.getElementById('restartCounter');
    if (restartCounter) {
        restartCounter.textContent = '';
    }

    // Initialize gaps if it's level 6
    if (level === 6) {
        console.log("Initializing level 6 gaps");
        initializeLevel6Gap();
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

  // Clear the tracker list
  const trackerList = document.getElementById("trackerList");
  if (trackerList) {
    trackerList.innerHTML = "";
  }

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
  const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";
  const isSoulEquipped = localStorage.getItem("isSoulAppearanceEquipped") === "true";

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
    
    // Save the current context state
    ctx.save();
    
    // Translate to the player's position
    ctx.translate(player.x + player.size/2, player.y + player.size/2);
    
    // Rotate based on direction
    switch(currentDirection) {
      case "ArrowDown":
        ctx.rotate(Math.PI); // 180 degrees
        break;
      case "ArrowLeft":
        ctx.rotate(-Math.PI/2); // -90 degrees
        break;
      case "ArrowRight":
        ctx.rotate(Math.PI/2); // 90 degrees
        break;
      default: // ArrowUp or no direction
        // No rotation needed
        break;
    }
    
    // Draw the image centered at the rotation point
    ctx.drawImage(currentImage, -player.size/2, -player.size/2, player.size, player.size);
    
    // Restore the context state
    ctx.restore();
  } else {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.size, player.size);
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
  
  // Clear any existing trail animation timeout
  if (trailTimeout) {
    clearTimeout(trailTimeout);
    trailTimeout = null;
  }

  isMoving = true;
  const speed = 2;
  const blockSize = 20; // Fixed block size
  let dx = 0, dy = 0;
  
  // Start soul animation if soul is equipped
  const isSoulEquipped = localStorage.getItem("isSoulAppearanceEquipped") === "true";
  if (isSoulEquipped) {
    clearInterval(soulAnimationInterval);
    soulAnimationInterval = setInterval(() => {
      currentSoulFrame = currentSoulFrame === 1 ? 2 : 1;
      drawPlayer();
    }, 250);
  }
  
  switch (currentDirection) {
    case "ArrowUp": dy = -speed; break;
    case "ArrowDown": dy = speed; break;
    case "ArrowLeft": dx = -speed; break;
    case "ArrowRight": dx = speed; break;
  }

  const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";
  const startX = player.x;
  const startY = player.y;
  let lastTrailX = startX;
  let lastTrailY = startY;

  // Add initial trail block at player's starting position if tail is equipped and soul is not
  if (isTailEquipped && !isSoulEquipped) {
    trailBlocks.push({ x: player.x, y: player.y });
    trailCtx.fillStyle = player.color;
    trailCtx.fillRect(player.x, player.y, player.size, player.size);
  }

  const doTheMove = () => {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (isCollision(newX, newY)) {
      // Snap to grid
      player.x = Math.round(player.x / blockSize) * blockSize;
      player.y = Math.round(player.y / blockSize) * blockSize;
      isMoving = false;

      // Stop soul animation when movement stops
      if (isSoulEquipped) {
        clearInterval(soulAnimationInterval);
        drawPlayer();
      }

      // Add final trail block at the last position
      if (isTailEquipped) {
        trailBlocks.push({ x: lastTrailX, y: lastTrailY });
        // Clear trail canvas and redraw all blocks
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
    } else {
      player.x = newX;
      player.y = newY;

      // Add trail blocks during movement
      if (isTailEquipped) {
        const distanceX = Math.abs(player.x - lastTrailX);
        const distanceY = Math.abs(player.y - lastTrailY);
        
        // Add a new trail block every blockSize pixels
        if (distanceX >= blockSize || distanceY >= blockSize) {
          // When soul is not equipped, add trail at current position
          const trailX = !isSoulEquipped ? player.x : lastTrailX;
          const trailY = !isSoulEquipped ? player.y : lastTrailY;
          trailBlocks.push({ x: trailX, y: trailY });
          
          // Clear trail canvas and redraw all blocks
          trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
          trailBlocks.forEach(block => {
            if (!isSoulEquipped || (block.x !== player.x || block.y !== player.y)) {
              trailCtx.fillStyle = player.color;
              trailCtx.fillRect(block.x, block.y, player.size, player.size);
            }
          });
          
          // Update last trail position
          lastTrailX = player.x;
          lastTrailY = player.y;
        }
      }

      drawPlayer();
      checkCheckpointCollision();
      if (currentLevel === 7) checkLevel7BlocksCollision(player);
      checkWin();

      requestAnimationFrame(doTheMove);
    }
  };

  doTheMove();
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
          gapElement.style.zIndex = '-2';
          
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

  // Start soul animation if soul is equipped
  const isSoulEquipped = localStorage.getItem("isSoulAppearanceEquipped") === "true";
  if (isSoulEquipped) {
    clearInterval(soulAnimationInterval);
    soulAnimationInterval = setInterval(() => {
      currentSoulFrame = currentSoulFrame === 1 ? 2 : 1;
      drawPlayer();
    }, 250);
  }

  switch (currentDirection) {
    case "ArrowUp": dy = -speed; break;
    case "ArrowDown": dy = speed; break;
    case "ArrowLeft": dx = -speed; break;
    case "ArrowRight": dx = speed; break;
  }

  const isTailEquipped = localStorage.getItem("isTailEffectEquipped") === "true";
  const startX = player.x;
  const startY = player.y;
  let lastTrailX = startX;
  let lastTrailY = startY;

  const doTheMove = () => {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (isCollision(newX, newY)) {
      // Snap to grid
      player.x = Math.round(player.x / blockSize) * blockSize;
      player.y = Math.round(player.y / blockSize) * blockSize;
      isMoving = false;

      // Stop soul animation when movement stops
      if (isSoulEquipped) {
        clearInterval(soulAnimationInterval);
        
        drawPlayer();
      }

      // Add final trail block at the last position
      if (isTailEquipped) {
        trailBlocks.push({ x: lastTrailX, y: lastTrailY });
        // Clear trail canvas and redraw all blocks except current position
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        trailBlocks.forEach(block => {
          if (block.x !== player.x || block.y !== player.y) {
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
    } else {
      player.x = newX;
      player.y = newY;

      // Add trail blocks during movement
      if (isTailEquipped) {
        const distanceX = Math.abs(player.x - lastTrailX);
        const distanceY = Math.abs(player.y - lastTrailY);
        
        // Add a new trail block every blockSize pixels
        if (distanceX >= blockSize || distanceY >= blockSize) {
          // When soul is not equipped, add trail at current position
          const trailX = !isSoulEquipped ? player.x : lastTrailX;
          const trailY = !isSoulEquipped ? player.y : lastTrailY;
          trailBlocks.push({ x: trailX, y: trailY });
          
          // Clear trail canvas and redraw all blocks
          trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
          trailBlocks.forEach(block => {
            if (!isSoulEquipped || (block.x !== player.x || block.y !== player.y)) {
              trailCtx.fillStyle = player.color;
              trailCtx.fillRect(block.x, block.y, player.size, player.size);
            }
          });
          
          // Update last trail position
          lastTrailX = player.x;
          lastTrailY = player.y;
        }
      }

      drawPlayer();
      checkCheckpointCollision();
      if (currentLevel === 7) checkLevel7BlocksCollision(player);
      checkWin();

      requestAnimationFrame(doTheMove);
    }
  };

  doTheMove();
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
    // Allow movement without checking game state flags
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

// Add the updateControlButtonStyles call to the brain palette equip button click handler
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
    
    // Reset scroll position after a short delay to ensure DOM is updated
    requestAnimationFrame(() => {
      unlockablesCenterWindow.scrollTop = 0;
    });
  }

  if (!hasUnlockables) {
    unlockablesCenterWindow.innerHTML = "nothing here... for now";
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
    equipButton.style.width = !wasEquipped ? "145px" : "100px";
    
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
    
    // Reset all dots to initial color
    Array.from(dotsLabel.children).forEach(dot => {
        dot.style.color = '#111111';
    });

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
    const caveImage = document.getElementById('caveImage');
    const cavePlayer = document.getElementById('cavePlayer');
    const winBlock = document.getElementById('caveWinBlock');
    let scrollY = 0;

    // Start scrolling but don't enable movement yet
    caveScrollInterval = setInterval(() => {
        if (!isGameActive) {
            clearInterval(caveScrollInterval);
            return;
        }

        scrollY += caveScrollSpeed;
        
        // Stop scrolling when reaching the end
        if (scrollY >= CAVE_HEIGHT - VISIBLE_HEIGHT) {
            clearInterval(caveScrollInterval);
            // Add a small delay before showing the win block
            setTimeout(() => {
                winBlock.style.opacity = '1';
            }, 500); // 500ms delay
            return;
        }

        // Calculate target scroll position based on player position
        const targetScrollY = Math.max(0, Math.min(cavePlayerY - VISIBLE_HEIGHT / 2, CAVE_HEIGHT - VISIBLE_HEIGHT));
        
        // Smoothly move towards target scroll position
        scrollY = scrollY * 0.9 + targetScrollY * 0.1;

        // Move the background image
        caveImage.style.transform = `translateY(${scrollY}px)`;

        // Update player's visual position relative to scroll
        const visualBottom = cavePlayerY - scrollY;
        cavePlayer.style.bottom = `${visualBottom}px`;

        // Keep win block hidden while scrolling
        winBlock.style.opacity = '0';

        // Update progress bar
        const progress = (cavePlayerY / (CAVE_HEIGHT - VISIBLE_HEIGHT)) * 98;
        const progressFill = document.querySelector('.cave-progress-fill');
        if (progressFill) {
            progressFill.style.setProperty('width', `${Math.min(98, Math.max(0, progress))}%`, 'important');
        }

        // Check if player is below the camera view
        if (cavePlayerY < scrollY) {
            clearInterval(caveScrollInterval);
            isGameActive = false;
            isCountdownComplete = false;
            showCaveLossPopup();
        }
    }, 16);
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
    // Don't allow movement if game is not active
    if (!isGameActive) {
        if (onComplete) onComplete();
        return;
    }

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

    // Add current position to trail
    caveTrailPositions.push({
        x: cavePlayerX,
        y: cavePlayerY,
        scrollY: parseFloat(document.getElementById('caveImage').style.transform.replace('translateY(', '').replace('px)', '') || 0)
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
    trailBlock.style.bottom = `${cavePlayerY - parseFloat(document.getElementById('caveImage').style.transform.replace('translateY(', '').replace('px)', '') || 0)}px`;
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

    // Update positions
    cavePlayerX = newX;
    cavePlayerY = newY;
    
    // Update player's horizontal position
    const cavePlayer = document.getElementById('cavePlayer');
    cavePlayer.style.left = `${cavePlayerX}px`;

    // Get current scroll position from cave image transform
    const caveImage = document.getElementById('caveImage');
    const currentScrollY = parseFloat(caveImage.style.transform.replace('translateY(', '').replace('px)', '') || 0);
    
    // Update player's visual position relative to scroll
    const visualBottom = cavePlayerY - currentScrollY;
    cavePlayer.style.bottom = `${visualBottom}px`;

    // Update progress bar
    const progress = (cavePlayerY / (CAVE_HEIGHT - VISIBLE_HEIGHT)) * 98;
    const progressFill = document.querySelector('.cave-progress-fill');
    if (progressFill) {
        progressFill.style.setProperty('width', `${Math.min(98, Math.max(0, progress))}%`, 'important');
    }

    // Update camera target
    cavePlayerObj.x = cavePlayerX;
    cavePlayerObj.y = cavePlayerY;
    caveCamera.update();

    // Update checkpoint visibility
    updateCaveCheckpoint();

    // Check for win condition
    checkCaveWin();

    // Continue moving in the same direction only if game is still active
    if (isGameActive) {
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
caveCollisionImage.src = 'assets/images/cave1.png';
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
function resetCaveState() {
    // First, clear any running intervals
    if (caveScrollInterval) {
        clearInterval(caveScrollInterval);
        caveScrollInterval = null;
    }

    // Clear any countdown timeouts
    countdownTimeouts.forEach(timeout => clearTimeout(timeout));
    countdownTimeouts = [];

    // Reset all state flags
    isGameActive = false;
    isCountdownComplete = false;
    isCaveMoving = false;
    
    // Reset player position to initial values
    cavePlayerX = 240;
    cavePlayerY = 0;
    
    // Reset visual positions
    const cavePlayer = document.getElementById('cavePlayer');
    if (cavePlayer) {
        cavePlayer.style.left = '240px';
        cavePlayer.style.bottom = '0px';
    }
    
    const caveImage = document.getElementById('caveImage');
    if (caveImage) {
        caveImage.style.transform = 'translateY(0)';
    }

    // Reset camera and player object
    if (caveCamera) {
        caveCamera.xView = 0;
        caveCamera.yView = 0;
    }
    if (cavePlayerObj) {
        cavePlayerObj.x = cavePlayerX;
        cavePlayerObj.y = cavePlayerY;
    }
    
    // Reset progress bar
    const progressFill = document.querySelector('.cave-progress-fill');
    if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.transition = 'none';
        // Re-enable transition after a brief delay
        setTimeout(() => {
            progressFill.style.transition = '';
        }, 50);
    }

    // Hide both loss and win popups
    const lossPopup = document.getElementById('caveLossPopup');
    if (lossPopup) {
        lossPopup.style.display = 'none';
    }
    const winPopup = document.getElementById('caveWinPopup');
    if (winPopup) {
        winPopup.style.display = 'none';
    }
    
    // Reset all checkpoints
    CAVE_CHECKPOINTS.forEach((checkpoint, index) => {
        checkpoint.isFound = false;
        const checkpointElement = document.getElementById(`caveCheckpoint${index}`);
        if (checkpointElement) {
            checkpointElement.style.opacity = '1';
        }
    });
    
    // Clear any queued animations
    cancelAnimationFrame(continuousMove);
}

// Add at the top with other global variables
const caveTrailPositions = [];
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
    // First, clear any running intervals
    if (caveScrollInterval) {
        clearInterval(caveScrollInterval);
        caveScrollInterval = null;
    }

    // Clear any countdown timeouts
    countdownTimeouts.forEach(timeout => clearTimeout(timeout));
    countdownTimeouts = [];

    // Reset all state flags
    isGameActive = false;
    isCountdownComplete = false;
    isCaveMoving = false;
    
    // Reset player position to initial values
    cavePlayerX = 240;
    cavePlayerY = 0;
    
    // Reset visual positions
    const cavePlayer = document.getElementById('cavePlayer');
    if (cavePlayer) {
        cavePlayer.style.left = '240px';
        cavePlayer.style.bottom = '0px';
    }
    
    const caveImage = document.getElementById('caveImage');
    if (caveImage) {
        caveImage.style.transform = 'translateY(0)';
    }

    // Reset camera and player object
    if (caveCamera) {
        caveCamera.xView = 0;
        caveCamera.yView = 0;
    }
    if (cavePlayerObj) {
        cavePlayerObj.x = cavePlayerX;
        cavePlayerObj.y = cavePlayerY;
    }
    
    // Reset progress bar
    const progressFill = document.querySelector('.cave-progress-fill');
    if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.transition = 'none';
        // Re-enable transition after a brief delay
        setTimeout(() => {
            progressFill.style.transition = '';
        }, 50);
    }

    // Hide both loss and win popups
    const lossPopup = document.getElementById('caveLossPopup');
    if (lossPopup) {
        lossPopup.style.display = 'none';
    }
    const winPopup = document.getElementById('caveWinPopup');
    if (winPopup) {
        winPopup.style.display = 'none';
    }
    
    // Reset all checkpoints and stars
    CAVE_CHECKPOINTS.forEach((checkpointData, index) => {
        checkpointData.isFound = false;
        const currentCheckpoint = document.getElementById(`caveCheckpoint${index}`);
        if (currentCheckpoint) {
            currentCheckpoint.style.opacity = '1';
        }
        // Reset star counter
        const starElement = document.querySelector(`.cave-star[data-star-index="${index}"]`);
        if (starElement) {
            starElement.classList.remove('collected');
        }
    });
    
    // Clear any queued animations
    cancelAnimationFrame(continuousMove);
}

function startCaveGame() {
    // Reset everything first
    resetCaveState();
    
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
    }, 16); // Update at ~60fps
    
    // Rest of the existing startCaveGame code...
    const lossPopup = document.getElementById('caveLossPopup');
    if (lossPopup) {
        lossPopup.style.display = 'none';
    }
    
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
    
    startCaveCountdown();
    // Reset all checkpoints
    CAVE_CHECKPOINTS.forEach((checkpointData, index) => {
        checkpointData.isFound = false;
        const currentCheckpoint = document.getElementById(`caveCheckpoint${index}`);
        if (currentCheckpoint) {
            currentCheckpoint.style.opacity = '1';
        }
    });
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

