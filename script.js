//348317-3b884c04-e6e4-4a3c-9018-fa99c7b4bbc4

$(document).ready(function () {
  // Accounts for the difference in the size of the dot in figma and the actual image size
  var X_DIFF = -30;
  var Y_DIFF = -40;

  // for lining up the location of the research circle
  var RESEARCH_DIFF = 400;
  var RESEARCH_CENTER_X = 1085;
  var RESEARCH_CENTER_Y = 440;

  // for locating background dots
  var BACKGROUND_DOT_SIZE_HALVED = 653;

  // variables for displaying lines
  var LINE_OPACITY_40 = 0.15;
  var LINE_OPACITY_60 = 0.25;
  var LINE_OPACITY_100 = 0.35;

  var LINE_GROUPINGS_40 = 3;
  var LINE_GROUPINGS_60 = 4;
  var LINE_GROUPINGS_100 = 4;

  var LINE_DENSITY_60_RESEARCH = 6;
  var LINE_DENSITY_100_RESEARCH = 4;

  // varables for the random drifting
  var DRIFT_FLOOR = 1;
  var DRIFT_AMP = 10;
  var DRIFT_VAR_M = 3;
  var DRIFT_VAR_N = 5;
  var DRIFT_VAR_O = 7;

  // Size of the drawing in Figma
  var FIGMA_WIDTH = 1512;
  var FIGMA_HEIGHT = 800;
  
  var NUM_PHASES = 6;

  // Frames per phase
  var DRIFT_FRAMES = 400;
  var MOBILE_DRIFT_FRAMES = 200;
  var TRANSITION_FRAMES = 80;

  // strings for phases
  var DATA_STRING = "Reliable Data";
  var RESEARCH_STRING = "Original Research";
  var MODELS_STRING = "Battle-Tested Models";

  // number of frames between letters removed when string is animating
  var STRING_ADD_RATE = 3;
  var STRING_REMOVE_RATE = 2;

  // ALPHA changes the intensity of the easing animation function
  var ALPHA = 1;

  // check for mobile
  var isMobile = false;
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  ) {
    isMobile = true;
  }

  // Setup the canvas element.
  var canvas = $("canvas.dots");
  var text = $("#changeText");
  var context = canvas[0].getContext("2d");
  var canvasWidth = canvas.width();
  var canvasHeight = canvas.height();
  canvas.attr({ height: canvasHeight, width: canvasWidth });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  //For resizing dot position
  var widthRatio = canvasWidth / FIGMA_WIDTH;
  var heightRatio = canvasHeight / FIGMA_HEIGHT;

  // currentFrame tracks the frame rate in any given stage
  // initialize frames
  var waitFrames = DRIFT_FRAMES;
  if (isMobile) waitFrames = MOBILE_DRIFT_FRAMES;
  var frames = waitFrames;
  var currentFrame = 0;

  // phases are as follows:
  // 0: data, dots drifting dots are connected in groups of 3
  // 1: animating from data to research
  // 2: research, drifting dots are connected to a single point
  // 3: animating from research to models
  // 4: models, drifting, all dots are connected
  // 5: animating from models to data
  var phase = 0;

  // Init String
  var currentString = DATA_STRING;

  // convert figma data to readable objects
  var fimgaData = getData(figma);
  var data = fimgaData.data;
  var research = fimgaData.research;
  var models = fimgaData.models;

  //set up our array of dots
  var numDots = data.dots["40"].length;
  var dots = [];
  createDots();

  // resizing the canvas has some weird issues when trying to cancel
  // the animation at each resize event
  // so we have a short timer to approximate the "end" of the event and
  // then restart the animation with the new dimensions
  var resizing = false;
  var resizeTimer;

  window.addEventListener(
    "resize",
    function (event) {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeDone, 100);
    },
    true
  );

  function resizeDone() {
    resizing = true;
  }

  // Load in our images
  var imgs = [];
  var numLoaded = 0;

  // big background image
  var backgroundDot = new Image();
  backgroundDot.src = "./assets/gradient.png";
  imgs.push(backgroundDot);

  //foreground large dot 100% opacity
  var large_dot = new Image();
  large_dot.src = "./assets/100.png";
  imgs.push(large_dot);

  // midground med dot 60% opacity
  var med_dot = new Image();
  med_dot.src = "./assets/60.png";
  imgs.push(med_dot);

  // background small dot 40% opacity
  var small_dot = new Image();
  small_dot.src = "./assets/40.png";
  imgs.push(small_dot);

  // once images are all loaded, we start animating
  var imgsLen = imgs.length;
  for (var i = 0; i < imgsLen; i++) {
    imgs[i].onload = function (i) {
      numLoaded++;
      if (numLoaded == imgsLen) {
        startAnimation();
      }
    };
  }

  // set up animation
  function startAnimation() {
    phase = 0;
    currentFrame = 0;
    frames = waitFrames;
    currentString = DATA_STRING;

    // draw large background dots
    drawBackground();

    //for each dot, we calculate the current position, and the velocities for the animation stages and draw
    for (i = 0; i < dots.length; i++) {
      setPositionAndVelocities(dots[i]);
      drawDot(dots[i]);
    }

    //next frame
    window.requestAnimationFrame(moveDot);
  }

  // moveDot draws the next frame of the animation
  function moveDot() {
    // Clear the canvas so we can draw on it again.
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!resizing) {
      drawBackground();

      // first we draw lines so they are behind the dots
      // phase 1 we fade out the connecting lines and fade in the lines from a single point
      if (phase % NUM_PHASES == 1) {
        drawLine((TRANSITION_FRAMES - currentFrame) / TRANSITION_FRAMES);
        drawLinesFromSinglePoint(currentFrame / TRANSITION_FRAMES);
        // phase 3 we fade out the single point lines and fade in the connecting lines
      } else if (phase % NUM_PHASES == 3) {
        drawLine(currentFrame / TRANSITION_FRAMES);
        drawLinesFromSinglePoint(
          (TRANSITION_FRAMES - currentFrame) / TRANSITION_FRAMES
        );
        // any phase but research, connecting lines
      } else if (phase % NUM_PHASES != 2) {
        drawLine(1);
        // research, lines come from a single point
      } else if (phase % NUM_PHASES == 2) {
        drawLinesFromSinglePoint(1);
      }

      // now we draw each dot
      // if we are in an animation phase we calcualte the easing variable and multiply it by the "velocity"
      // theres probably a more efficient way of calculating these positions at the start and not having to do it each cycle
      if (
        phase % NUM_PHASES == 1 ||
        phase % NUM_PHASES == 3 ||
        phase % NUM_PHASES == 5
      ) {
        var time = currentFrame / frames;
        var e = easeing(time);
        // fixes weird error when e == 0
        if (e < 0.005) e = 0.005;
        // for each dot we add the "velocity" or change in position, then draw the dot
        for (i = 0; i < dots.length; i++) {
          dots[i].c.x += dots[i].v[phase % NUM_PHASES].x * e;
          dots[i].c.y += dots[i].v[phase % NUM_PHASES].y * e;

          drawDot(dots[i]);
        }
      } else {
        // if in a waiting phase, we draw the dot based off its formula for random motion
        // theres probably a more efficient way of calculating these positions at the start and not having to do it each cycle
        for (i = 0; i < dots.length; i++) {
          var position = dotDriftPosition(dots[i]);
          drawDot(dots[i], position.x, position.y);
        }
      }

      // Move the current time forward by one frame.
      currentFrame += 1;

      // If we've reached our maximum number of frames, jump to next phase and wait.
      if (currentFrame == frames) {
        currentFrame = 0;
        phase += 1;

        // change string base off phase
        if (phase % NUM_PHASES == 1) {
          currentString = RESEARCH_STRING;
          frames = TRANSITION_FRAMES;
        } else if (phase % NUM_PHASES == 3) {
          currentString = MODELS_STRING;
          frames = TRANSITION_FRAMES;
        } else if (phase % NUM_PHASES == 5) {
          currentString = DATA_STRING;
          frames = TRANSITION_FRAMES;
        } else {
          frames = waitFrames;
        }
      }

      // string length is based off the number of frames in a phase
      // if the wait phase is coming to an end, the every other frame will result in a letter being removed
      if (
        phase % NUM_PHASES == 0 ||
        phase % NUM_PHASES == 2 ||
        phase % NUM_PHASES == 4
      ) {
        drawText(
          currentString.slice(
            0,
            waitFrames / STRING_REMOVE_RATE - currentFrame / STRING_REMOVE_RATE
          )
        );
      } else {
        // if the animation phase is starting, every third frame a letter will be added
        drawText(currentString.slice(0, currentFrame / STRING_ADD_RATE));
      }

      //next frame
      window.requestAnimationFrame(moveDot);
    } else {
      // reset our variables on resizing and restart the animation
      canvasWidth = canvas.width();
      canvasHeight = canvas.height();
      canvas.attr({ height: canvasHeight, width: canvasWidth });
      resizing = false;
      createDots();
      startAnimation();
    }
  }

  function drawDot(dot, x, y) {
    var img = large_dot;

    // change image based off size of dot
    if (dot.size == 40) {
      img = small_dot;
    } else if (dot.size == 60) {
      img = med_dot;
    }

    // if coordinates provided, use, if not use dots current location
    // this is because the drifing animation is based off a single point and does not change the "current location"
    context.drawImage(
      img,
      Math.floor(x * 100) / 100 || Math.floor(dot.c.x * 100) / 100,
      Math.floor(y * 100) / 100 || Math.floor(dot.c.y * 100) / 100
    );
  }

  // draw large background dots
  function drawBackground() {
    var research_X_DIFF = RESEARCH_DIFF / widthRatio - RESEARCH_DIFF;
    context.drawImage(
      backgroundDot,
      -BACKGROUND_DOT_SIZE_HALVED,
      -BACKGROUND_DOT_SIZE_HALVED
    );
    context.drawImage(
      backgroundDot,
      RESEARCH_CENTER_X + X_DIFF - research_X_DIFF - BACKGROUND_DOT_SIZE_HALVED,
      RESEARCH_CENTER_Y + Y_DIFF - BACKGROUND_DOT_SIZE_HALVED
    );
  }

  function drawText(string, x, y) {
    text.text(string);
  }

  // reads data in figma.js (could pull this from figma API but I'm too lazy to try that so i just have the results of a single pull saved in a file)
  function getData(dataObj) {
    let data = {
      x: dataObj.nodes["750:7640"].document.children[0].absoluteBoundingBox.x,
      y: dataObj.nodes["750:7640"].document.children[0].absoluteBoundingBox.y,
      children: dataObj.nodes["750:7640"].document.children[0].children,
      dots: {
        40: [],
        60: [],
        100: [],
      },
    };

    let research = {
      x: dataObj.nodes["750:7640"].document.children[1].absoluteBoundingBox.x,
      y: dataObj.nodes["750:7640"].document.children[1].absoluteBoundingBox.y,
      children: dataObj.nodes["750:7640"].document.children[1].children,
      dots: {
        40: [],
        60: [],
        100: [],
      },
    };

    let models = {
      x: dataObj.nodes["750:7640"].document.children[2].absoluteBoundingBox.x,
      y: dataObj.nodes["750:7640"].document.children[2].absoluteBoundingBox.y,
      children: dataObj.nodes["750:7640"].document.children[2].children,
      dots: {
        40: [],
        60: [],
        100: [],
      },
    };

    data.children.forEach((point) => {
      let opacity = point.name.split("_")[0];
      let index = point.name.split("_")[1];
      let x = point.absoluteBoundingBox.x - data.x;
      let y = point.absoluteBoundingBox.y - data.y;

      data.dots[opacity].unshift({
        x: Math.floor(x),
        y: Math.floor(y),
        name: index,
      });
    });

    research.children.forEach((point) => {
      let opacity = point.name.split("_")[0];
      let index = point.name.split("_")[1];
      let x = point.absoluteBoundingBox.x - research.x;
      let y = point.absoluteBoundingBox.y - research.y;

      research.dots[opacity].unshift({
        x: Math.floor(x),
        y: Math.floor(y),
        name: index,
      });
    });

    models.children.forEach((point) => {
      let opacity = point.name.split("_")[0];
      let index = point.name.split("_")[1];
      let x = point.absoluteBoundingBox.x - models.x;
      let y = point.absoluteBoundingBox.y - models.y;

      models.dots[opacity].unshift({
        x: Math.floor(x),
        y: Math.floor(y),
        name: index,
      });
    });

    return {
      data: data,
      research: research,
      models: models,
    };
  }

  // fills out our dot array and calculates the positions at each phase
  function createDots() {
    dots = [];
    widthRatio = canvasWidth / FIGMA_WIDTH;
    heightRatio = canvasHeight / FIGMA_HEIGHT;

    var research_X_DIFF = RESEARCH_DIFF / widthRatio - RESEARCH_DIFF;

    for (i = 0; i < numDots; i++) {
      var dot = {
        p: [
          {},
          {
            x: data.dots["40"][i].x * widthRatio + X_DIFF,
            y: data.dots["40"][i].y * heightRatio + Y_DIFF,
          },
          {},
          {
            x: research.dots["40"][i].x + X_DIFF - research_X_DIFF,
            y: research.dots["40"][i].y + Y_DIFF,
          },
          {},
          {
            x: models.dots["40"][i].x * widthRatio + X_DIFF,
            y: models.dots["40"][i].y * heightRatio + Y_DIFF,
          },
        ],
        size: 40,
        v: [{}, {}, {}, {}, {}, {}],
        c: {},
        m: getRandomArbitrary(1, DRIFT_VAR_M),
        n: getRandomArbitrary(1, DRIFT_VAR_N),
        o: getRandomArbitrary(1, DRIFT_VAR_O),
        s: getRandomArbitrary(DRIFT_FLOOR, DRIFT_AMP - 3),
        q: getRandomArbitrary(0, 2),
      };
      dots.push(dot);
    }

    for (i = 0; i < numDots; i++) {
      var dot = {
        p: [
          {},
          {
            x: data.dots["60"][i].x * widthRatio + X_DIFF,
            y: data.dots["60"][i].y * heightRatio + Y_DIFF,
          },
          {},
          {
            x: research.dots["60"][i].x + X_DIFF - research_X_DIFF,
            y: research.dots["60"][i].y + Y_DIFF,
          },
          {},
          {
            x: models.dots["60"][i].x * widthRatio + X_DIFF,
            y: models.dots["60"][i].y * heightRatio + Y_DIFF,
          },
        ],
        size: 60,
        v: [{}, {}, {}, {}, {}, {}],
        c: {},
        m: getRandomArbitrary(1, DRIFT_VAR_M),
        n: getRandomArbitrary(1, DRIFT_VAR_N),
        o: getRandomArbitrary(1, DRIFT_VAR_O),
        s: getRandomArbitrary(DRIFT_FLOOR, DRIFT_AMP),
        q: getRandomArbitrary(0, 2),
      };
      dots.push(dot);
    }

    for (i = 0; i < numDots; i++) {
      var dot = {
        i: i,
        p: [
          {},
          {
            x: data.dots["100"][i].x * widthRatio + X_DIFF,
            y: data.dots["100"][i].y * heightRatio + Y_DIFF,
          },
          {},
          {
            x: research.dots["100"][i].x + X_DIFF - research_X_DIFF,
            y: research.dots["100"][i].y + Y_DIFF,
          },
          {},
          {
            x: models.dots["100"][i].x * widthRatio + X_DIFF,
            y: models.dots["100"][i].y * heightRatio + Y_DIFF,
          },
        ],
        size: 100,
        v: [{}, {}, {}, {}, {}, {}],
        c: {},
        m: getRandomArbitrary(1, DRIFT_VAR_M),
        n: getRandomArbitrary(1, DRIFT_VAR_N),
        o: getRandomArbitrary(1, DRIFT_VAR_O),
        s: getRandomArbitrary(DRIFT_FLOOR, DRIFT_AMP + 3),
        q: getRandomArbitrary(0, 2),
      };
      dots.push(dot);
    }
  }

  // calculate the change in position necesary at each frame to move between points at a set rate
  // we could probably do the easing here and then have the change in position be an array of changes?
  function setPositionAndVelocities(dot) {
    //set position
    dot.c = { x: dot.p[1].x, y: dot.p[1].y };

    //set velocity by phase
    dot.v[1] = {
      x: (dot.p[3].x - dot.p[1].x) / TRANSITION_FRAMES,
      y: (dot.p[3].y - dot.p[1].y) / TRANSITION_FRAMES,
    };
    dot.v[3] = {
      x: (dot.p[5].x - dot.p[3].x) / TRANSITION_FRAMES,
      y: (dot.p[5].y - dot.p[3].y) / TRANSITION_FRAMES,
    };
    dot.v[5] = {
      x: (dot.p[1].x - dot.p[5].x) / TRANSITION_FRAMES,
      y: (dot.p[1].y - dot.p[5].y) / TRANSITION_FRAMES,
    };
  }

  // get number between min and max
  function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  // function for the drifting
  // gives random orbits shaped like circles or clovers, or stars with n points based off input variables
  function dotDriftPosition(dot) {
    if (!isMobile) {
      var theta = (1 * Math.PI * currentFrame) / waitFrames;

      // change direction of orbit (looks weird when they all go clockwise)
      if (!dot.q) {
        theta = 1 * Math.PI - theta;
      }

      var r =
        dot.s *
        (Math.sin(dot.m * theta) + (1 / dot.n) * Math.sin(theta / dot.o));

      // convert to cartesian coordinates
      var x = r * Math.cos(theta) + dot.c.x;
      var y = r * Math.sin(theta) + dot.c.y;

      // if (dot.i == 80) {
      //   console.log(x, y);
      // }

      return {
        x: Math.floor(x * 100) / 100,
        y: Math.floor(y * 100) / 100,
      };
    } else {
      return {
        x: dot.c.x,
        y: dot.c.y,
      };
    }
  }

  function easeing(t) {
    var sqr = Math.pow(t, ALPHA);
    var sqrminus = Math.pow(1 - t, ALPHA);
    return sqr / (sqr + sqrminus) / 0.5;
  }

  function drawLine(opacity) {
    if (!opacity) opacity = 0;

    // lines for background dots
    context.strokeStyle =
      "rgba(0, 195, 137, " + LINE_OPACITY_40 * opacity + ")";
    context.beginPath();
    for (i = 0; i < dots.length / 3; i++) {
      // for most phases we do groupings of dots
      if (
        (phase % NUM_PHASES == 0 ||
          phase % NUM_PHASES == 1 ||
          phase % NUM_PHASES == 2 ||
          phase % NUM_PHASES == 3 ||
          phase % NUM_PHASES == 5) &&
        i % LINE_GROUPINGS_40 == 0
      ) {
        // end and start new stroke to define new grouping
        context.stroke();
        context.beginPath();
      } else {
        var position = dotDriftPosition(dots[i]);
        context.lineTo(position.x + 30, position.y + 30);
      }
    }
    context.stroke();

    // lines for midground dots
    context.strokeStyle =
      "rgba(0, 195, 137, " + LINE_OPACITY_60 * opacity + ")";
    context.beginPath();
    for (i = 0; i < dots.length / 3; i++) {
      // for most phases we do groupings of dots
      if (
        (phase % NUM_PHASES == 0 ||
          phase % NUM_PHASES == 1 ||
          phase % NUM_PHASES == 2 ||
          phase % NUM_PHASES == 3 ||
          phase % NUM_PHASES == 5) &&
        i % LINE_GROUPINGS_60 == 0
      ) {
        // end and start new stroke to define new grouping
        context.stroke();
        context.beginPath();
      } else {
        var position = dotDriftPosition(dots[dots.length / 3 + i]);
        context.lineTo(position.x + 30.5, position.y + 30.5);
      }
    }
    context.stroke();

    // lines for foreground dots
    context.strokeStyle =
      "rgba(0, 195, 137, " + LINE_OPACITY_100 * opacity + ")";
    context.beginPath();
    for (i = 0; i < dots.length / 3; i++) {
      // for most phases we do groupings of dots
      if (
        (phase % NUM_PHASES == 0 ||
          phase % NUM_PHASES == 1 ||
          phase % NUM_PHASES == 2 ||
          phase % NUM_PHASES == 3 ||
          phase % NUM_PHASES == 5) &&
        i % LINE_GROUPINGS_100 == 0
      ) {
        // end and start new stroke to define new grouping
        context.stroke();
        context.beginPath();
      } else {
        var position = dotDriftPosition(dots[(2 * dots.length) / 3 + i]);
        context.lineTo(position.x + 32.5, position.y + 32.5);
      }
    }
    context.stroke();
  }

  // For the research phase
  function drawLinesFromSinglePoint(opacity) {
    var research_X_DIFF = RESEARCH_DIFF / widthRatio - RESEARCH_DIFF;
    var center_x = RESEARCH_CENTER_X + X_DIFF - research_X_DIFF;
    var center_y = RESEARCH_CENTER_Y + Y_DIFF;

    // lines for the middle dots only.  Opacity is lower because it was distracting otherwise
    context.strokeStyle =
      "rgba(0, 195, 137, " + LINE_OPACITY_40 * opacity + ")";
    for (i = 0; i < dots.length / 3; i++) {
      if (i % LINE_DENSITY_60_RESEARCH == 0) {
        context.beginPath();
        context.moveTo(center_x, center_y);
        var position = dotDriftPosition(dots[dots.length / 3 + i]);
        context.lineTo(position.x + 30.5, position.y + 30.5);
        context.stroke();
      }
    }
    context.stroke();

    // lines for the foreground dots only.  Opacity is lower because it was distracting otherwise
    context.strokeStyle =
      "rgba(0, 195, 137, " + LINE_OPACITY_60 * opacity + ")";
    for (i = 0; i < dots.length / 3; i++) {
      if (i % LINE_DENSITY_100_RESEARCH == 0) {
        context.beginPath();
        context.moveTo(center_x, center_y);
        var position = dotDriftPosition(dots[(2 * dots.length) / 3 + i]);
        context.lineTo(position.x + 32.5, position.y + 32.5);
        context.stroke();
      }
    }
    context.stroke();
  }
});

//   // Placement limits for random positioning
//   var x_limit = canvasWidth;
//   var y_limit = canvasHeight;

//   // Radius of the circle for the second stage
//   var radius = 240;

//   function randomPositionBoundByCircle() {
//     var r = radius * Math.sqrt(Math.random());
//     var theta = Math.random() * 2 * Math.PI;

//     return {
//       x: (canvasWidth * 2) / 3 + r * Math.cos(theta),
//       y: canvasHeight / 2 + r * Math.sin(theta),
//     };
//   }

//   function randomPositionBoundBySin(i) {
//     var x = (canvasWidth / numDots) * i;
//     var y =
//       100 * Math.sin((x / canvasWidth) * Math.PI * 3) +
//       (canvasHeight / 4) * 3 +
//       getRandomArbitrary(-(i * 0.5), i * 0.5) -
//       i * 0.8;
//     return {
//       x: x + getRandomArbitrary(-40, 40),
//       y: y,
//     };
//   }

// for (i = 0; i < numDots; i++) {
//     var dot = {
//         p: [
//                 {},
//                 {x: getRandomArbitrary(0, x_limit), y: getRandomArbitrary(0, y_limit)},
//                 {},
//                 randomPositionBoundByCircle(),
//                 {},
//                 randomPositionBoundBySin(i),
//             ],
//         v: [{}, {}, {}, {}, {}, {}],
//         c: {},
//         size: getRandomArbitrary(60, 100)/100,
//         m: getRandomArbitrary(1,3),
//         n: getRandomArbitrary(1,5),
//         o: getRandomArbitrary(1,7),
//         s: getRandomArbitrary(1,8),
//         q: getRandomArbitrary(0,2),
//     };
//     dots.push(dot);
// }
