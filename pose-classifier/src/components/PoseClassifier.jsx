import React, { useEffect, useRef, useState } from 'react';
const config = {
  video: { width: 640, height: 480, fps: 30 }
}

const landmarkColors = {
  thumb: 'red',
  index: 'blue',
  middle: 'yellow',
  ring: 'green',
  pinky: 'pink',
  wrist: 'white'
}

const availableGestures = [
  { 'thumbs_up': '👍' },
  { 'victory': '✌🏻' },
  { 'thumbs-down': '👎' },
  { 'closed-fist': '👊' },
  { 'open-palm': '🖐' },
  { 'pinch': '🤏' },
]

async function createDetector() {
  return window.handPoseDetection.createDetector(
    window.handPoseDetection.SupportedModels.MediaPipeHands,
    {
      runtime: "mediapipe",
      modelType: "full",
      maxHands: 2,
      solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915`,
    }
  )
}


async function initCamera(width, height, fps) {

  const constraints = {
    audio: false,
    video: {
      facingMode: "user",
      width: width,
      height: height,
      frameRate: { max: fps }
    }
  }

  const video = document.querySelector("#pose-video")
  video.width = width
  video.height = height

  // get video stream
  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  video.srcObject = stream

  return new Promise(resolve => {
    video.onloadedmetadata = () => { console.log('camera loaded'); resolve(video) }
  })
}

function drawPoint(ctx, x, y, r, color) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()
}

function updateDebugInfo(data, hand, setRightHand, setLeftHand) {
  if (hand === 'left') {
    console.log(hand);
    setLeftHand(data);
  } else {
    console.log(hand);
    setRightHand(data);
  }
  const summaryTable = `#summary-${hand}`
  // console.log(data);
  for (let fingerIdx in data) {
    document.querySelector(`${summaryTable} span#curl-${fingerIdx}`).innerHTML = data[fingerIdx][1]
    document.querySelector(`${summaryTable} span#dir-${fingerIdx}`).innerHTML = data[fingerIdx][2]
  }
}

const PoseClassifier = () => {

  const [gestureStrings, setGestureStrings] = useState({
    'thumbs_up': '👍',
    'victory': '✌🏻',
    'thumbs-down': '👎'
  });

  const [rightHand, setRightHand] = useState({
    thumb: '',
    index: '',
    middle: '',
    ring: '',
    pinky: ''
  });

  const [leftHand, setLeftHand] = useState({
    thumb: '',
    index: '',
    middle: '',
    ring: '',
    pinky: ''
  })
  console.log(rightHand);

  const nameRef = useRef(null);

  const [selGestures, setSelGestures] = useState([]);
  const [gestureNames, setGestureNames] = useState({
    left: ['-', '-', '-', '-', '-'],
    right: ['-', '-', '-', '-', '-']
  });

  async function main() {

    const video = document.querySelector("#pose-video")
    const canvas = document.querySelector("#pose-canvas")
    const ctx = canvas.getContext("2d")

    const resultLayer = {
      right: document.querySelector("#pose-result-right"),
      left: document.querySelector("#pose-result-left")
    }
    // configure gesture estimator
    // add "✌🏻" and "👍" as sample gestures
    // console.log(fp.Gestures.ThumbsUpGesture);

    const knownGestures = [
      fp.Gestures.VictoryGesture,
      fp.Gestures.ThumbsUpGesture,
      // fp.Gestures.ThumbsDownGesture,
      // fp.Gestures.,
      // MyGesture
      createThumbsDownGesture(),
      createClosedFistGesture(),
      createPinchGesture(),
      createOpenPalmGesture(),

    ]
    const GE = new fp.GestureEstimator(knownGestures)
    // load handpose model
    const detector = await createDetector()
    console.log("mediaPose model loaded")

    // main estimation loop
    const estimateHands = async () => {

      // clear canvas overlay
      ctx.clearRect(0, 0, config.video.width, config.video.height)
      resultLayer.right.innerText = ''
      resultLayer.left.innerText = ''

      // get hand landmarks from video
      const hands = await detector.estimateHands(video, {
        flipHorizontal: true
      })

      for (const hand of hands) {
        for (const keypoint of hand.keypoints) {
          const name = keypoint.name.split('_')[0].toString().toLowerCase()
          const color = landmarkColors[name]
          // console.log(name, keypoint.x, keypoint.y);
          drawPoint(ctx, keypoint.x, keypoint.y, 3, color)
        }

        const est = GE.estimate(hand.keypoints3D, 9)
        console.log(est);
        if (est.gestures.length > 0) {

          // find gesture with highest match score
          let result = est.gestures.reduce((p, c) => {
            return (p.score > c.score) ? p : c
          })
          const chosenHand = hand.handedness.toLowerCase()
          console.log(result);
          const gestureObj = selGestures.reduce((obj, item) => {
            const key = Object.keys(item)[0]; // Get the key from the item
            const value = item[key]; // Get the value from the item
            obj[key] = value; // Add the key-value pair to the object
            return obj;
          }, {})

          console.log(gestureObj);
          resultLayer[chosenHand].innerText = gestureObj[result.name]
          updateDebugInfo(est.poseData, chosenHand, setRightHand, setLeftHand)
        }

      }
      // ...and so on
      setTimeout(() => { estimateHands() }, 1000 / config.video.fps)
    }

    estimateHands()
    console.log("Starting predictions")
  }

  useEffect(() => {
    // run();
  }, [])

  const run = () => {
    initCamera(
      config.video.width, config.video.height, config.video.fps
    ).then(video => {
      video.play()
      video.addEventListener("loadeddata", event => {
        console.log("Camera is ready")
        main()
      })
    })

    const canvas = document.querySelector("#pose-canvas")
    canvas.width = config.video.width
    canvas.height = config.video.height
    console.log("Canvas initialized");
    console.log(fp.Gestures.VictoryGesture);

  }

  const createThumbsDownGesture = () => {
    const gesture = new fp.GestureDescription('thumbs-down');
    gesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl);
    gesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalDown, 1.0);
    return gesture
  }

  const createClosedFistGesture = () => {
    const gesture = new fp.GestureDescription('closed-fist');

    for (let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
      gesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
    }

    return gesture;
  }

  const createOpenPalmGesture = () => {
  const gesture = new fp.GestureDescription('open-palm');
  
  for(let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    gesture.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    gesture.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
  }
  
  return gesture;
}

const createPinchGesture = () => {
  const gesture = new fp.GestureDescription('pinch');
  
  gesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
  gesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
  
  for(let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    gesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  }
  
  return gesture;
}

  const checkGesture = (hand) => {
    console.log(hand);
    if (!hand.length) return null;
    if (hand[0][0] === 'Thumb' && hand[0][1] === 'No Curl' && hand[0][2] === 'Vertical Up') {
      return 0;
    } else if (hand[1][0] === 'Index' && hand[1][1] === 'Full Curl' && hand[1][2] === 'Diagonal Up Left') {
      return 1;
    } else if (hand[2][0] === 'Middle' && hand[2][1] === 'Full Curl' && hand[2][2] === 'Diagonal Up Left') {
      return 2;
    } else if (hand[3][0] === 'Ring' && hand[3][1] === 'Full Curl' && hand[3][2] === 'Diagonal Down Left') {
      return 3;
    } else if (hand[4][0] === 'Pinky' && hand[4][1] === 'Full Curl' && hand[4][2] === 'Diagonal Down Left') {
      return 4;
    }
  }

  const setGesture = () => {
    const value = nameRef.current.value;
    if (!value) {
      return;
    }
    let temp = gestureNames;
    if (true) {
      if (checkGesture(rightHand) === null)
        return;
      temp[checkGesture(rightHand)] = value;
    } else {
      if (checkGesture(leftHand) === null)
        return;
      temp[checkGesture(leftHand)] = value;
    }
    console.log(temp);

    setGestureNames(temp);
  }

  useEffect(() => {
    console.log(rightHand);
  }, [rightHand])


  return (
    <div className="container1 mx-5">
      <button onClick={run} className='btn btn-primary' style={{ width: "120px", height: "200px" }}><font className='fs-5'>Start Post Estimator</font></button>

      <div>
        <h2>Choose Gestures</h2>
        {
          availableGestures.map((gesture, index) => {
            return (
              <div>
                <input type="checkbox" checked={
                  selGestures.filter(g => Object.keys(g)[0] === Object.keys(gesture)[0]).length > 0
                } onChange={(e) => {
                  if (e.target.checked) {
                    setSelGestures([...selGestures, gesture]);
                    console.log(selGestures);
                  } else {
                    setSelGestures(selGestures.filter(g => Object.keys(g)[0] !== Object.keys(gesture)[0]))
                  }
                }} />
                <label htmlFor="">{Object.keys(gesture)[0]}</label>
              </div>
            )
          })
        }
      </div>
      <div className="video">
        <div id="video-container">
          <video id="pose-video" className="layer" playsInline="" />
          <canvas id="pose-canvas" className="layer" />
          <div id="pose-result-left" className="layer pose-result" />
          <br />
          <div id="pose-result-right" className="layer pose-result" />
        </div>
      </div>
      <div className="debug">
        <div className="input-group">
          <select type="text" className='form-control' ref={nameRef} >
            <option value="">Select Gesture</option>
            {/* {
              gestureStrings.map((gesture, index) => {
                return (
                  <option key={index} value={gesture.name}>{gesture.icon}</option>
                )
              })
            } */}
          </select>
          <div className='input-group-append'>
            <button className='btn btn-primary' onClick={setGesture}>Add Gesture Name</button>
          </div>
        </div>
        <h2>Left Hand</h2>
        <table id="summary-left" className="summary">
          <thead>
            <tr>
              <th>Idx</th>
              <th>Finger</th>
              <th style={{ width: 110 }}>Curl</th>
              <th style={{ width: 170 }}>Direction</th>
              {/* <th style={{ width: 170 }}>Gesture Name</th> */}
            </tr>
          </thead>
          <tbody>
            {
              Object.keys(leftHand).map((key, index) => {
                return (
                  <tr key={index}>
                    <td>{index}</td>
                    <td>{key}</td>
                    <td>
                      <span id={`curl-${index}`}>{leftHand[key]}</span>
                    </td>
                    <td>
                      <span id={`dir-${index}`}>-</span>
                    </td>
                    {/* <td>
                      <span>{gestureNames.left[index]}</span>
                    </td> */}
                  </tr>
                )
              })
            }
          </tbody>
        </table>
        <br />
        <h2>Right Hand</h2>
        <table id="summary-right" className="summary">
          <thead>
            <tr>
              <th>Idx</th>
              <th>Finger</th>
              <th style={{ width: 110 }}>Curl</th>
              <th style={{ width: 170 }}>Direction</th>
              {/* <th style={{ width: 170 }}>Gesture Name</th> */}
            </tr>
          </thead>
          <tbody>
            {
              Object.keys(rightHand).map((key, index) => {
                return (
                  <tr key={index}>
                    <td>{index}</td>
                    <td>{key}</td>
                    <td>
                      <span id={`curl-${index}`}>{rightHand[key]}</span>
                    </td>
                    <td>
                      <span id={`dir-${index}`}>-</span>
                    </td>
                    {/* <td>
                      <span>{gestureNames.right[index]}</span>
                    </td> */}
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PoseClassifier;