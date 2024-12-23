// References to DOM elements
const levelSelection = document.getElementById("levelSelection");

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

const soundEffect = new Audio('blockhit1.mp3'); // Replace with your sound file path

achievementsButton.addEventListener('click', () => {
  achievementsModal.classList.add('active');
});

closeButton.addEventListener('click', () => {
  achievementsModal.classList.remove('active');
});

achievementsModal.addEventListener('click', (event) => {
  if (event.target === achievementsModal) {
      achievementsModal.classList.remove('active');
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const levelSelection = document.getElementById("levelSelection"); // Declare this variable
  const startGameButton = document.getElementById("startGameButton");
  const backgroundMusic = new Audio("./assets/audio/i careOST.mp3"); // Background music
  const volumeSlider = document.getElementById("volumeSlider"); // Slider
  const volumeValueDisplay = document.getElementById("volumeValue"); // Display value

  volumeValueDisplay.textContent = "25%";

  // Music settings
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.25;

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
});

const levelCompletionTimes = {};

document.addEventListener("DOMContentLoaded", () => {
  const menuElement = document.getElementById("menuElement");

  // Array of frame URLs
  const frames = [
    "assets/frames/menuelementframe1.png",
    "assets/frames/menuelementframe2.png",
    "assets/frames/menuelementframe3.png",
    "assets/frames/menuelementframe4.png",
    "assets/frames/menuelementframe5.png",
    "assets/frames/menuelementframe6.png",
    "assets/frames/menuelementframe7.png",
    "assets/frames/menuelementframe8.png",
    "assets/frames/menuelementframe9.png",
    "assets/frames/menuelementframe10.png",
    "assets/frames/menuelementframe11.png",
    "assets/frames/menuelementframe12.png",
    "assets/frames/menuelementframe13.png",
    "assets/frames/menuelementframe14.png",
    "assets/frames/menuelementframe15.png",
    "assets/frames/menuelementframe16.png",
    "assets/frames/menuelementframe17.png",
    "assets/frames/menuelementframe18.png",
    "assets/frames/menuelementframe19.png",
    "assets/frames/menuelementframe20.png",
    "assets/frames/menuelementframe21.png",
    "assets/frames/menuelementframe22.png",
    "assets/frames/menuelementframe23.png",
    "assets/frames/menuelementframe24.png",
    "assets/frames/menuelementframe25.png",
    "assets/frames/menuelementframe26.png",
    "assets/frames/menuelementframe27.png",
    "assets/frames/menuelementframe28.png",
    "assets/frames/menuelementframe29.png",
    // Add more frames as needed
  ];

  let currentFrame = 0;
  const frameDuration = 125; // Duration per frame in milliseconds (0.3 seconds)

  // Function to update the frame
  function updateFrame() {
    currentFrame = (currentFrame + 1) % frames.length; // Loop back to the first frame
    menuElement.src = frames[currentFrame];
  }

  // Preload all frames to avoid flickering
  frames.forEach((frame) => {
    const img = new Image();
    img.src = frame;
  });

  // Start the frame animation
  setInterval(updateFrame, frameDuration); // Frame animation
});

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
    ).textContent = `Time: ${minutes}:${seconds}`;
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

  // Optional: Stop any level music or reset settings
  console.log("Returning to Main Menu...");
});

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

let playerSteps = []; // Stores the player’s moves
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

  // Case 1: Player hasn’t moved yet
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
}

function enableHintButton() {
  hintButton.disabled = false;
  hintButton.textContent = "Hint";
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

function showLevelAnnouncement(level) {
  const root = document.documentElement;

  // Set base and highlight colors
  const baseColor = "#999999";
  const highlightColor = "#CCCCCC";

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
    (highlightSequenceDuration - highlightDuration) /
      (levelTextContent.length - 1),
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
  // Change body background color based on the level
  updateBodyBackgroundColor();

  // Update controls button colors based on the level
  updateControlsButtonColors();

  levelSelection.style.display = "none";
  // Show the level announcement
  showLevelAnnouncement(currentLevel);

  // Show the game container
  gameContainer.style.display = "block";

  // Show the Menu button since we're in a level
  menuButton.style.display = "block";

  // Show the Hint button when in a level
  hintButton.style.display = "block";

  // Set the maze image and initialize the level
  mazeImage.src = mazeImageSrc;

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
  nextLevelButton.style.display = currentLevel < 6 ? "block" : "none";
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
  const trackerContainer = document.querySelector(".tracker-container");

  // Use CSS variables to define styles
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue("--background-color")
    .trim();
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-color")
    .trim();
  const border = `2px solid ${getComputedStyle(document.documentElement)
    .getPropertyValue("--border-color")
    .trim()}`;

  // Apply the styles
  trackerContainer.style.backgroundColor = background;
  trackerContainer.style.color = color;
  trackerContainer.style.border = border;
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
    mazeContainer.style.boxShadow = `inset 0 0 ${blurRadius}px 0 rgba(0, 0, 0, ${opacity})`;

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
  const mazeBorderColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--border-color")
    .trim();
  document.querySelector(
    "canvas"
  ).style.border = `1px solid ${mazeBorderColor}`;
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

    // Extract the elapsed time from the timer display
    const elapsedTime = document
      .getElementById("timerDisplay")
      .textContent.split(": ")[1];
    levelCompletionTimes[`level${currentLevel}`] = elapsedTime;

    // Display the win popup
    winPopup.style.display = "block";

    // Update the move count message with elapsed time
    moveCountMessage.innerHTML = `You won and it took you ${moveCount} moves.<br>
                your time was ${elapsedTime}.<br>..loser`;

    // Show or hide the next level button based on the current level
    const nextLevelButton = document.getElementById("nextLevelButton");
    const menuButtonPopup = document.getElementById("menuButtonPopup");

    if (currentLevel < 8) {
      nextLevelButton.style.display = "block";
      menuButtonPopup.style.display = "none";
    } else {
      nextLevelButton.style.display = "none";
      menuButtonPopup.style.display = "block";
    }

    // Update level selector with completion time
    updateLevelCompletionTime();
  }
}

function updateLevelCompletionTime() {
  for (let level in levelCompletionTimes) {
    const button = document.getElementById(`${level}Button`);
    if (button) {
      // Grab id for timer
      let timeLabel = document.getElementById(`${level}Timer`);
      // Update the time label content
      timeLabel.textContent = `Time: ${levelCompletionTimes[level]}`;
      // show timeLabel
      timeLabel.style.display = "block";
    }
  }
}

const stupidLevels = [
  { src: "level1.png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
  { src: "level2(4).png", s: { x: 180, y: 40 }, f: { x: 180, y: 380 } },
  { src: "level3(3).png", s: { x: 180, y: 0 }, f: { x: 180, y: 340 } },
  { src: "level4(1).png", s: { x: 180, y: 0 }, f: { x: 180, y: 320 } },
  { src: "level5(2).png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
  { src: "level6(2).png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
  { src: "level7.png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
  { src: "level8(1).png", s: { x: 180, y: 0 }, f: { x: 180, y: 380 } },
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
};

function preStartGame(level) {
  currentLevel = level; // Set current level
  showLevelAnnouncement(level);

  const getStupidLevel = stupidLevels[level - 1];

  document.getElementById("timerDisplay").textContent = "Time: 00:00";
  startTimer();

  const timerDisplay = document.getElementById("timerDisplay");
  timerDisplay.style.color = timerColors[level] || "#CCCCCC"; // Default to gray if no color is set

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
}

function startLevel(level) {
  console.log("Starting Level", level);
  document.getElementById("levelSelection").style.display = "none";
  document.getElementById("gameContainer").style.display = "flex";
  menuButton.style.display = "block"; // Show the Menu button
  // Initialize game logic for the selected level here
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
const resetButton = document.getElementById("resetButton");
const trackerList = document.getElementById("trackerList");
const winPopup = document.getElementById("winPopup");
const moveCountMessage = document.getElementById("moveCountMessage");

const mazeImage = new Image();
mazeImage.src = "level1.png";

resetButton.addEventListener("click", restartGame);

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

  // Update lastDirection after starting the move
  lastDirection = direction;
}

function recolorMaze() {
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
  const newColor = { r: 34, g: 34, b: 34 }; // Replace this with your desired color

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

  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = scaledWidth;
  offscreenCanvas.height = scaledHeight;
  const offscreenCtx = offscreenCanvas.getContext("2d");
  offscreenCtx.drawImage(mazeImage, 0, 0, scaledWidth, scaledHeight);

  const imageData = offscreenCtx.getImageData(0, 0, scaledWidth, scaledHeight);
  mazeData = imageData.data;
}

function drawPlayer(cPlayer) {
  recolorMaze();
  drawExit();
  // draw hint
  if (cPlayer) {
    ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
    ctx.fillRect(cPlayer.x, cPlayer.y, cPlayer.size, cPlayer.size);
  }
  // and draw player
  ctx.fillStyle = player.color; // Use the player's color
  ctx.fillRect(player.x, player.y, player.size, player.size);
}

function drawExit() {
  // Retrieve the exit color from the CSS variable
  const exitColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--exit-color")
    .trim();
  ctx.fillStyle = exitColor; // Use the color from the palette
  ctx.fillRect(exit.x, exit.y, exit.size, exit.size);
}

function isCollision(newX, newY, pPlayer) {
  let cPlayer = player;

  if (pPlayer) {
    cPlayer = pPlayer;
  }

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
    console.log(
      `Checking collision at (${corner.x}, ${corner.y}):`,
      mazeData[index]
    ); // Debugging
    if (mazeData[index] !== 0) {
      return true;
    }
  }
  return false;
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

function startMoving() {
  if (isMoving) return; // Prevent overlapping movements

  isMoving = true; // Lock movement
  const speed = 2;
  let dx = 0,
    dy = 0;

  switch (currentDirection) {
    case "ArrowUp":
      dx = 0;
      dy = -speed;
      break;
    case "ArrowDown":
      dx = 0;
      dy = speed;
      break;
    case "ArrowLeft":
      dx = -speed;
      dy = 0;
      break;
    case "ArrowRight":
      dx = speed;
      dy = 0;
      break;
  }

  movingInterval = setInterval(() => {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (
      newX < 0 ||
      newX + player.size > canvas.width ||
      newY < 0 ||
      newY + player.size > canvas.height ||
      isCollision(newX, newY)
    ) {
      clearInterval(movingInterval); // Stop movement on collision
      movingInterval = null; // Reset interval reference
      player.x = Math.round(player.x / speed) * speed; // Align position to grid
      player.y = Math.round(player.y / speed) * speed;
      isMoving = false; // Unlock movement

      soundEffect.currentTime = 0; // Reset sound playback
      soundEffect.play(); // Play sound effect

      playerLastPositions.push({
        x: Math.round(player.x / speed) * speed,
        y: Math.round(player.y / speed) * speed,
      });

      // Update lastDirection only after completing a move
      lastDirection = currentDirection;

      drawPlayer();
      checkWin();
      processNextMove(); // Process the next move in the queue
    } else {
      // Update player position
      player.x = newX;
      player.y = newY;
      drawPlayer();
      checkWin();
    }
  }, 10);
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

function restartGame() {
  // Stop any ongoing movement
  clearInterval(movingInterval);
  movingInterval = null; // Reset interval reference

  playerSteps = [];
  playerLastPositions = [];
  lastCorrectStep = 0;

  // Reset game states
  isMoving = false;
  isExecutingMoves = false;
  currentDirection = null;
  nextDirection = null;
  lastDirection = null;
  moveQueue.length = 0; // Clear the move queue
  moveCount = 0;

  // Reset player position
  player.x = player.startX;
  player.y = player.startY;

  // Clear tracker list
  trackerList.innerHTML = "";

  // Hide win popup
  winPopup.style.display = "none";

  // Redraw the maze and player
  drawPlayer();
}

function executeMoves() {
  if (isExecutingMoves || moveQueue.length === 0) return; // Prevent overlap
  isExecutingMoves = true;

  const interval = setInterval(() => {
    if (moveQueue.length === 0 || isMoving) {
      clearInterval(interval); // Stop when all moves are processed or already moving
      isExecutingMoves = false; // Reset flag
      return;
    }

    const direction = moveQueue.shift(); // Get next move
    currentDirection = direction; // Set current direction
    startMoving(); // Start moving
  }, 300); // Delay between moves
}

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
