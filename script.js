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
  var DRIFT_AMP = 18;
  var DRIFT_VAR_M = 3;
  var DRIFT_VAR_N = 5;
  var DRIFT_VAR_O = 7;

  // Setup the canvas element.
  var canvas = $("canvas.dots");
  var text = $("#changeText");
  var context = canvas[0].getContext("2d");
  var canvasWidth = canvas.width();
  var canvasHeight = canvas.height();
  canvas.attr({ height: canvasHeight, width: canvasWidth });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  // Size of the drawing in Figma
  var canvasBaseWidth = 1512;
  var canvasBaseHeight = 800;

  //For resizing dot position
  var widthRatio = canvasWidth / canvasBaseWidth;
  var heightRatio = canvasHeight / canvasBaseHeight;

  // Set the number of frames we want to run
  var wait_frames = 400;
  var change_frames = 80;
  var frames = wait_frames;

  // currentFrame tracks the frame rate in any given stage
  var currentFrame = 0;

  // phases are as follows:
  // 0: data, dots drifting dots are connected in groups of 3
  // 1: animating from data to research
  // 2: research, drifting dots are connected to a single point
  // 3: animating from research to models
  // 4: models, drifting, all dots are connected
  // 5: animating from models to data
  var phase = 0;
  var num_phases = 6;

  // Strings to go with each phase
  var dataString = "Reliable Data";
  var researchString = "Original Research";
  var modelString = "Battle-Tested Models";
  var currentString = dataString;

  // number of frames between letters removed when string is animating
  var STRING_ADD_RATE = 3;
  var STRING_REMOVE_RATE = 2;

  // alpha changes the intensity of the easing animation function
  let alpha = 1;

  // convert figma data to readable objects
  var fimgaData = getData(figma);
  var data = fimgaData.data;
  var research = fimgaData.research;
  var models = fimgaData.models;

  //set up our array of dots
  var num_dots = data.dots["40"].length;
  var dots = [];
  createDots();

  // resizing the canvas has some weird issues when trying to cancel
  // the animation at each resize event
  // so we have a short timer to approximate the "end" of the event and
  // then restart the animation with the new dimensions
  var resizing = false;
  var resizeTimer;

  window.addEventListener("resize", function (event) {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeDone, 100);
    }, true
  );

  function resizeDone() {
    resizing = true;
  }

  // Load in our images
  var imgs = [];
  var loaded = 0;

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
  var img_len = imgs.length;
  for (var i = 0; i < img_len; i++) {
    imgs[i].onload = function (i) {
      loaded++;
      if (loaded == img_len) {
        startAnimation();
      }
    };
  }

  // set up animation
  function startAnimation() {
    phase = 0;
    currentFrame = 0;
    frames = wait_frames;
    currentString = dataString;

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
      if (phase % num_phases == 1) {
        drawLine((change_frames - currentFrame) / change_frames);
        drawLinesFromSinglePoint(currentFrame / change_frames);
      // phase 3 we fade out the single point lines and fade in the connecting lines
      } else if (phase % num_phases == 3) {
        drawLine(currentFrame / change_frames);
        drawLinesFromSinglePoint(
          (change_frames - currentFrame) / change_frames
        );
      // any phase but research, connecting lines
      } else if (phase % num_phases != 2) {
        drawLine(1);
      // research, lines come from a single point
      } else if (phase % num_phases == 2) {
        drawLinesFromSinglePoint(1);
      }

      // now we draw each dot
      // if we are in an animation phase we calcualte the easing variable and multiply it by the "velocity"
      // theres probably a more efficient way of calculating these positions at the start and not having to do it each cycle
      if (phase % num_phases == 1 || phase % num_phases == 3 || phase % num_phases == 5) {
        var time = currentFrame / frames;
        var e = easeing(time);
        // fixes weird error when e == 0
        if (e < 0.005) e = 0.005;
        // for each dot we add the "velocity" or change in position, then draw the dot
        for (i = 0; i < dots.length; i++) {
          dots[i].c.x += dots[i].v[phase % num_phases].x * e;
          dots[i].c.y += dots[i].v[phase % num_phases].y * e;

          drawDot(dots[i]);
        }
      } else {
        // if in a waiting phase, we draw the dot based off its formula for random motion
        // theres probably a more efficient way of calculating these positions at the start and not having to do it each cycle
        for (i = 0; i < dots.length; i++) {
          var position = drawDotWithJitter(dots[i]);
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
        if (phase % num_phases == 1) {
          currentString = researchString;
          frames = change_frames;
        } else if (phase % num_phases == 3) {
          currentString = modelString;
          frames = change_frames;
        } else if (phase % num_phases == 5) {
          currentString = dataString;
          frames = change_frames;
        } else {
          frames = wait_frames;
        }
      }

      // string length is based off the number of frames in a phase
      // if the wait phase is coming to an end, the every other frame will result in a letter being removed
      if (phase % num_phases == 0 || phase % num_phases == 2 || phase % num_phases == 4) {
        drawText(currentString.slice(0, wait_frames / STRING_REMOVE_RATE - currentFrame / STRING_REMOVE_RATE));
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
    context.drawImage(img, Math.floor(x*100)/100 || Math.floor(dot.c.x*100)/100, Math.floor(y*100)/100 || Math.floor(dot.c.y*100)/100);
  }

  // draw large background dots
  function drawBackground() {
    var research_X_DIFF = RESEARCH_DIFF / widthRatio - RESEARCH_DIFF;
    context.drawImage(backgroundDot, -BACKGROUND_DOT_SIZE_HALVED, -BACKGROUND_DOT_SIZE_HALVED);
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
        x: x,
        y: y,
        name: index,
      });
    });

    research.children.forEach((point) => {
      let opacity = point.name.split("_")[0];
      let index = point.name.split("_")[1];
      let x = point.absoluteBoundingBox.x - research.x;
      let y = point.absoluteBoundingBox.y - research.y;

      research.dots[opacity].unshift({
        x: x,
        y: y,
        name: index,
      });
    });

    models.children.forEach((point) => {
      let opacity = point.name.split("_")[0];
      let index = point.name.split("_")[1];
      let x = point.absoluteBoundingBox.x - models.x;
      let y = point.absoluteBoundingBox.y - models.y;

      models.dots[opacity].unshift({
        x: x,
        y: y,
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
    widthRatio = canvasWidth / canvasBaseWidth;
    heightRatio = canvasHeight / canvasBaseHeight;

    var research_X_DIFF = RESEARCH_DIFF / widthRatio - RESEARCH_DIFF;

    for (i = 0; i < num_dots; i++) {
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

    for (i = 0; i < num_dots; i++) {
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

    for (i = 0; i < num_dots; i++) {
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
      x: (dot.p[3].x - dot.p[1].x) / change_frames,
      y: (dot.p[3].y - dot.p[1].y) / change_frames,
    };
    dot.v[3] = {
      x: (dot.p[5].x - dot.p[3].x) / change_frames,
      y: (dot.p[5].y - dot.p[3].y) / change_frames,
    };
    dot.v[5] = {
      x: (dot.p[1].x - dot.p[5].x) / change_frames,
      y: (dot.p[1].y - dot.p[5].y) / change_frames,
    };
  }

  // get number between min and max
  function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  // function for the drifting
  // gives random orbits shaped like circles or clovers, or stars with n points based off input variables
  function drawDotWithJitter(dot) {
    var theta = (1 * Math.PI * currentFrame) / wait_frames;

    // change direction of orbit (looks weird when they all go clockwise)
    if (!dot.q) {
      theta = 1 * Math.PI - theta;
    }

    var r = dot.s * (Math.sin(dot.m * theta) + (1 / dot.n) * Math.sin(theta / dot.o));

    // convert to cartesian coordinates
    var x = r * Math.cos(theta) + dot.c.x;
    var y = r * Math.sin(theta) + dot.c.y;

    // if (dot.i == 80) {
    //   console.log(x, y);
    // }

    return {
      x: Math.floor(x*100)/100,
      y: Math.floor(y*100)/100,
    };
  }

  function easeing(t) {
    var sqr = Math.pow(t, alpha);
    var sqrminus = Math.pow(1 - t, alpha);
    return (sqr / (sqr + sqrminus))/(.5);
  }

  function drawLine(opacity) {
    if (!opacity) opacity = 0;

    // lines for background dots
    context.strokeStyle = "rgba(0, 195, 137, " + LINE_OPACITY_40 * opacity + ")";
    context.beginPath();
    for (i = 0; i < dots.length / 3; i++) {
      // for most phases we do groupings of dots
      if (
        (phase % num_phases == 0 ||
          phase % num_phases == 1 ||
          phase % num_phases == 2 ||
          phase % num_phases == 3 ||
          phase % num_phases == 5) &&
        i % LINE_GROUPINGS_40 == 0
      ) {
        // end and start new stroke to define new grouping
        context.stroke();
        context.beginPath();
      } else {
        var position = drawDotWithJitter(dots[i]);
        context.lineTo(position.x + 30, position.y + 30);
      }
    }
    context.stroke();

    // lines for midground dots
    context.strokeStyle = "rgba(0, 195, 137, " + LINE_OPACITY_60 * opacity + ")";
    context.beginPath();
    for (i = 0; i < dots.length / 3; i++) {
      // for most phases we do groupings of dots
      if (
        (phase % num_phases == 0 ||
          phase % num_phases == 1 ||
          phase % num_phases == 2 ||
          phase % num_phases == 3 ||
          phase % num_phases == 5) &&
        i % LINE_GROUPINGS_60 == 0
      ) {
        // end and start new stroke to define new grouping
        context.stroke();
        context.beginPath();
      } else {
        var position = drawDotWithJitter(dots[dots.length / 3 + i]);
        context.lineTo(position.x + 30.5, position.y + 30.5);
      }
    }
    context.stroke();

    // lines for foreground dots
    context.strokeStyle = "rgba(0, 195, 137, " + LINE_OPACITY_100 * opacity + ")";
    context.beginPath();
    for (i = 0; i < dots.length / 3; i++) {
        // for most phases we do groupings of dots
      if (
        (phase % num_phases == 0 ||
          phase % num_phases == 1 ||
          phase % num_phases == 2 ||
          phase % num_phases == 3 ||
          phase % num_phases == 5) &&
        i % LINE_GROUPINGS_100 == 0
      ) {
        // end and start new stroke to define new grouping
        context.stroke();
        context.beginPath();
      } else {
        var position = drawDotWithJitter(dots[(2 * dots.length) / 3 + i]);
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
    context.strokeStyle = "rgba(0, 195, 137, " + LINE_OPACITY_40 * opacity + ")";
    for (i = 0; i < dots.length / 3; i++) {
      if (i % LINE_DENSITY_60_RESEARCH == 0) {
        context.beginPath();
        context.moveTo(center_x, center_y);
        var position = drawDotWithJitter(dots[dots.length / 3 + i]);
        context.lineTo(position.x + 30.5, position.y + 30.5);
        context.stroke();
      }
    }
    context.stroke();

    // lines for the foreground dots only.  Opacity is lower because it was distracting otherwise
    context.strokeStyle = "rgba(0, 195, 137, " + LINE_OPACITY_60 * opacity + ")";
    for (i = 0; i < dots.length / 3; i++) {
      if (i % LINE_DENSITY_100_RESEARCH == 0) {
        context.beginPath();
        context.moveTo(center_x, center_y);
        var position = drawDotWithJitter(dots[(2 * dots.length) / 3 + i]);
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
//     var x = (canvasWidth / num_dots) * i;
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

// for (i = 0; i < num_dots; i++) {
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
