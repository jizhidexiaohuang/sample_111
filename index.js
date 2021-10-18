// import {ZegoClient} from "../sdk/wechatMini/zego.client.wechat";
var zg,
  now = new Date().getTime(),
  appid = 1739272706,//1739272706,//2405892216 ,229059616 ,956332586
  bigRoom_appid = 1811473550,
  domainName = "test.zegonetwork.com",
  serverEnv = {
    pro: "wss://wsliveroom" + 1739272706 + "-api.zego.im:8282/ws",
    alpha: "wss://wsliveroom-alpha.zego.im:8282/ws",
    test: 'wss://wssliveroom-test.zego.im/ws',
    test2: 'wss://test2-wsliveroom-api.zego.im:8282/ws',
    h5: 'ws://120.78.126.222:13001/ws'
  },
  _config = {
    "appid": 1234567,
    "deviceId": 'deviceid01',
    "deviceType": '',
    "anType": 0,   //Area Network Type. 0,外网接入；1,内网接入
    "idName": '' + now,
    "nickName": 'u' + now,
    //"server": serverEnv.h5,
    "dispatchServer": `https://${domainName}:1143/dispatch/connection`,
    "logLevel": 0,
    "logUrl": "wss://testcrh03.hczq.com:13001/log",
    "remoteLogLevel": 0,
    "roomFlag": true,
    //"audienceCreateRoom": false,
    "testEnvironment": false
  },
  loginRoom = false,
  previewVideo,
  useLocalStreamList = [],
  anchor_userid,
  anchro_username,
  isLogin = false,
  isPreviewed = false,
  $userList = [],
  _fromUserId;
streamId = _config.idName
let apiDomain = `https://${domainName}:20443`;
recordConfig = {
  remoteUserid: '',

}

function init() {
  previewVideo = $('#previewVideo')[0];

  zg = new ZegoClient();
  setConfig(zg);
  zg.setUserStateUpdate(true);

  console.log("config param:" + JSON.stringify(_config));

  zg.config(_config);
  // zg.setCustomSignalUrl('wss://webrtctest.zego.im/ws?a=webrtc-demo');

  enumDevices();

  // 监听sdk回掉
  listen();
}

function respondJoinLive(flag, requestId, fromUserId) {
  var accept = flag;
  window._fromUserId = fromUserId;
  zg.respondJoinLive(requestId, accept, function (seq) {
    console.log('respondJoinLive success', seq);
  }, function (err, seq) {
    console.log('respondJoinLive err', err, seq);
  })
}

function generateTokenInfo(appId) {
  let expireTime = (new Date().getTime()) / 1000 + 60 * 60;
  expireTime = Number.parseInt(expireTime + '');

  const serverSecret = "a053dc0e074cf8e283128c326d018179";
  const nonce = md5(Math.random() + '');
  const checkToken = appId + serverSecret + nonce + expireTime;
  const hash = md5(checkToken);

  const tokenInfo = {
    ver: 1,
    hash: hash,
    nonce: nonce,
    expired: expireTime
  };

  const token = Base64.encode(JSON.stringify(tokenInfo));

  return token;
}

function openRoom(roomId, type) {
  if (isLogin) {
    return leaveRoom();
  }

  if (!roomId) {
    alert('请输入房间号');
    return;
  }

  startLogin(token, type)

  // $.post(tokenUrl, {
  //         seq: 0,
  //         timestamp: new Date().getTime(),
  //         app_id: _config.appid,
  //         user_id: _config.idName,
  //         user_name: _config.nickName,
  //         queue_role: 0,
  //         room_role: 0,
  //         net_type: 2,
  //         device_id: _config.deviceId
  //     },
  //     function (res) {
  //         token = JSON.parse(res).login_token

  //         if (!token) {
  //             alert('get token failed')
  //         } else {
  //             console.log('gettoken success');
  //             startLogin(token, type)
  //         }
  //     }, 'text');


  //login
  function startLogin(token, type) {
    zg.login(token, function (streamList) {
      console.log('login success');
      loginSuccess(streamList, type);
    }, function (err) {
      loginFailed(err);
    })
  }

  function loginFailed(err) {
    alert('登录失败');
    console.error(err)

  }

  function loginSuccess(streamList, type) {

    isLogin = true;

    //限制房间最多人数，原因：视频软解码消耗cpu，浏览器之间能支撑的个数会有差异，太多会卡顿
    if (streamList.length >= 4) {
      alert('房间太拥挤，换一个吧！');
      leaveRoom();
      return;
    }

    useLocalStreamList = streamList;

    $('.remoteVideo').html('')
    for (var index = 0; index < useLocalStreamList.length; index++) {
      $('.remoteVideo').append($('<video  autoplay muted playsinline controls ></video>'));
      play(useLocalStreamList[index].stream_id, $('.remoteVideo video:eq(' + index + ')')[0]);
    }
    console.log(`login success`);

    loginRoom = true;


    //开始预览本地视频
    type === 1 && doPreviewPublish();

  }

}

function openHall() {
  tokenUrl = `https://${domainName}:16443/logintoken`;

  $.ajax({
    type: 'POST',
    url: tokenUrl,
    data: JSON.stringify({
      "seq": 1,
      "timestamp": Math.ceil(new Date().getTime() / 1000),
      "app_id": _config.appid,
      "user_id": _config.idName,
      "user_name": _config.nickName,
      "queue_role": 10,
      "room_role": 0,
      "net_type": 2,
      "device_id": _config.deviceId
    }),
    success: res => {
      let token = res.login_token
      zg.login(token, () => {
        alert('登录大厅成功')
      }, err => {
        alert('登录大厅失败 ' + err.code + err.msg)
      })
    },
    contentType: 'application/json',
    dataType: 'json'
  })
}


function enumDevices() {
  var audioInputList = [], videoInputList = [];
  zg.enumDevices(deviceInfo => {
    console.log('enumDevices' + JSON.stringify(deviceInfo));
    if (deviceInfo.microphones) {
      for (let i = 0; i < deviceInfo.microphones.length; i++) {

        if (!deviceInfo.microphones[i].label) {
          deviceInfo.microphones[i].label = 'microphone' + i;
        }
        audioInputList.push(' <option value="' + deviceInfo.microphones[i].deviceId + '">' + deviceInfo.microphones[i].label + '</option>');
        console.log("microphone: " + deviceInfo.microphones[i].label);
      }
      audioInputList.push('<option value="0">禁用</option>');
    }

    if (deviceInfo.cameras) {
      for (let i = 0; i < deviceInfo.cameras.length; i++) {
        if (!deviceInfo.cameras[i].label) {
          deviceInfo.cameras[i].label = 'camera' + i;
        }
        videoInputList.push('<option value="' + deviceInfo.cameras[i].deviceId + '">' + deviceInfo.cameras[i].label + '</option>');
        console.log("camera: " + deviceInfo.cameras[i].label);
      }
      videoInputList.push('<option value="0">禁用</option>');
    }

    $('#audioList').html(audioInputList.join(''));
    $('#videoList').html(videoInputList.join(''));
  }, function (error) {
    console.error("enum device error: " + error);
  });
}


//预览
function doPreviewPublish(config, externalVide) {
  var previewConfig = {
    "audio": $('#audioList').val() === '0' ? false : true,
    "audioInput": $('#audioList').val() || null,
    "video": $('#videoList').val() === '0' ? false : true,
    "videoInput": $('#videoList').val() || null,
    "videoQuality": 4,
    "horizontal": true,
    "externalCapture": false,
    "externalMediaStream": null,
    "width": 320,
    "height": 240,
    "frameRate": 15,
    "bitRate": $('#videoBitRateInput').val() * 1,
    audioBitRate: $('#audioBitRateInput').val() * 1,
    noiseSuppression: $('#noiseSuppression').val() === '1' ? true : false,
    autoGainControl: $('#autoGainControl').val() === '1' ? true : false,
    echoCancellation: $('#echoCancellation').val() === '1' ? true : false,
  };
  previewConfig = $.extend(previewConfig, config);
  console.log('previewConfig', previewConfig);

  previewVideo = externalVide ? externalVide : previewVideo;
  var result = zg.startPreview(previewVideo, previewConfig, function () {
    console.log('preview success');
    isPreviewed = true;
    $('#previewLabel').html(_config.nickName);
    publish();
    //部分浏览器会有初次调用摄像头后才能拿到音频和视频设备label的情况
  }, function (err) {
    console.error('preview failed', err);
  });

  if (!result) alert('预览失败！')
}

function getPreviewConfig() {
  return {
    "audio": $('#audioList').val() === '0' ? false : true,
    "audioInput": null,
    "video": $('#videoList').val() === '0' ? false : true,
    "videoInput": null,
    "videoQuality": 4,
    "horizontal": true,
    "externalCapture": false,
    "externalMediaStream": null,
    "width": 320,
    "height": 240,
    "frameRate": 15,
    "bitRate": $('#videoBitRateInput').val() * 1,
    audioBitRate: $('#audioBitRateInput').val() * 1,
    noiseSuppression: $('#noiseSuppression').val() === '1',
    autoGainControl: $('#autoGainControl').val() === '1',
    echoCancellation: $('#echoCancellation').val() === '1'
  }
}


// function doPreviewPublish() {
//     var previewConfig = {
//         "audio": $('#audioList').val() === '0' ? false : true,
//         "audioInput": $('#audioList').val() || null,
//         "video": $('#videoList').val() === '0' ? false : true,
//         "videoInput": $('#videoList').val() || null,
//         "videoQuality": 2,
//         "horizontal": true,
//         "externalCapture": true,
//         "externalMediaStream": null
//     };
//     previewVideo = $('#previewVideo')[0];
//     zg.startPreview(previewVideo, previewConfig, function () {
//         console.log('preview success');
//         isPreviewed = true;
//         $('#previewLabel').html(_config.nickName);
//
//         publish();
//         //部分浏览器会有初次调用摄像头后才能拿到音频和视频设备label的情况，
//         enumDevices();
//     }, function (err) {
//         console.error('preview failed', err);
//     });
// }

//推流
function publish() {
  var videoCodeType = $('#videoCodeType').val();
  zg.startPublishingStream(_config.idName, previewVideo, null, { videoDecodeType: videoCodeType ? videoCodeType : 'H264' });//{cdnUrl:'rtmp://47.100.59.215/cnzegodemo/teststream11'}
}


function play(streamId, video) {
  var playVideoCodeType = $('#playVideoCodeType').val();
  var result = zg.startPlayingStream(streamId, video, null, {
    //playType: 'all',
    videoDecodeType: playVideoCodeType ? playVideoCodeType : 'H264'
  });//

  if (!result) {
    alert('哎呀，播放失败啦');
    video.style = 'display:none';
    console.error("play " + el.nativeElement.id + " return " + result);

  } else {
    video.muted = false;
    // video.play();
  }

}


function listen() {
  var _config = {

    onPlayStateUpdate: function (type, streamid, error) {
      if (type == 0) {
        console.info('play  success');
      }
      else if (type == 2) {
        console.info('play retry');
      } else {

        console.error("play error " + error.msg);

        var _msg = error.msg;
        if (error.msg.indexOf('server session closed, reason: ') > -1) {
          var code = error.msg.replace('server session closed, reason: ', '');
          if (code == 21) {
            _msg = '音频编解码不支持(opus)';
          } else if (code == 22) {
            _msg = '视频编解码不支持(H264)'
          } else if (code == 20) {
            _msg = 'sdp 解释错误';
          }
        }
        alert('拉流失败,reason = ' + _msg);
      }

    },

    onPublishStateUpdate: function (type, streamid, error) {
      if (type == 0) {
        console.info(' publish  success');
      } else if (type == 2) {
        console.info(' publish  retry');
      } else {
        console.error('publish error ' + error.msg);
        var _msg = error.msg;
        if (error.msg.indexOf('server session closed, reason: ') > -1) {
          var code = error.msg.replace('server session closed, reason: ', '');
          if (code == 21) {
            _msg = '音频编解码不支持(opus)';
          } else if (code == 22) {
            _msg = '视频编解码不支持(H264)'
          } else if (code == 20) {
            _msg = 'sdp 解释错误';
          }
        }
        alert('推流失败,reason = ' + _msg);

      }

    },

    onPublishQualityUpdate: function (streamid, quality) {
      console.log(quality);
      console.info("#" + streamid + "#" + "publish " + " audio: " + quality.audioBitrate + " video: " + quality.videoBitrate + " fps: " + quality.videoFPS);
    },

    onPlayQualityUpdate: function (streamid, quality) {
      console.log(quality);
      console.info("#" + streamid + "#" + "play " + " audio: " + quality.audioBitrate + " video: " + quality.videoBitrate + " fps: " + quality.videoFPS);
    },

    onDisconnect: function (error) {
      console.error("onDisconnect " + JSON.stringify(error));
      alert('网络连接已断开' + JSON.stringify(error));
      leaveRoom();
    },

    onKickOut: function (error) {
      console.error("onKickOut " + JSON.stringify(error));
      if (error.code == 'VideoTalkOut') {
        $('.remoteVideo video:eq(0)')[0].srcObject = null;
        //zg.stopPreview(previewVideo);
        zg.stopPublishingStream(streamId)
      }
    },

    onTempBroken: function () {
      console.warn('temp broken ,start reconnect')
    },

    onReconnect: function () {
      alert('重连成功')
    },

    onStreamUpdated: function (type, streamList) {
      if (type == 0) {
        for (var i = 0; i < streamList.length; i++) {
          console.info(streamList[i].stream_id + ' was added');
          useLocalStreamList.push(streamList[i]);
          if (streamType !== 1) {
            $('.remoteVideo').append($('<video  autoplay muted playsinline controls></video>'));
            play(streamList[i].stream_id, $('.remoteVideo video:last-child')[0]);
          }
        }

      } else if (type == 1) {

        for (var k = 0; k < useLocalStreamList.length; k++) {

          for (var j = 0; j < streamList.length; j++) {

            if (useLocalStreamList[k].stream_id === streamList[j].stream_id) {

              zg.stopPlayingStream(useLocalStreamList[k].stream_id);

              console.info(useLocalStreamList[k].stream_id + 'was devared');

              useLocalStreamList.splice(k, 1);

              $('.remoteVideo video:eq(' + k + ')').remove();

              break;
            }
          }
        }
      }

    },

    onStreamExtraInfoUpdated: function (streamList) {
      console.log('onStreamExtraInfoUpdated');
      console.log(streamList);
    },

    onVideoSizeChanged: function (streamid, videoWidth, videoHeight) {
      console.info("#" + streamid + "#" + "play " + " : " + videoWidth + "x" + videoHeight);
    },

    onGetAnchorInfo: function (userid, username) {
      window.anchor_userid = userid, window.anchro_username = username;
    },

    onRecvJoinLiveRequest: function (requestId, from_userid, from_username, roomid) {
      console.log('onRecvJoinLiveRequest', requestId, from_userid, from_username, roomid);
      $('#exampleModalLabel').text("收到id为" + requestId + "的连麦请求")
      $('#liveConfirm').click();
      $('#liveAgree').on('click', function () {
        respondJoinLive(true, requestId, from_userid)
      })
      $('#liveRefuse').on('click', function () {
        respondJoinLive(false, requestId, from_userid)
      })
    },

    onRecvInviteJoinLiveRequest: function (requestId, from_userid, from_username, roomid) {
      console.log('onRecvInviteJoinLiveRequest', requestId, from_userid, from_username, roomid);
      $('#exampleModalLabel').text("收到id为" + requestId + "的连麦请求")
      $('#liveConfirm').click();
      $('#liveAgree').on('click', function () {
        doPreviewPublish()
      })
    },

    onRecvEndJoinLiveCommand: function (requestId, from_userid, from_username, roomid) {
      console.log('onRecvEndJoinLiveCommand', requestId, from_userid, from_username, roomid);
      isPreviewed && zg.stopPreview(previewVideo);
      isPreviewed && zg.stopPublishingStream(_config.idName);
    },
    onUserStateUpdate: function (roomId, userList) {
      console.log('onUserStateUpdate', roomId, userList);
      userList.forEach(function (item) {
        if (item.action === 0) {
          $userList.push(item);
        } else if (item.action === 1) {
          $userList.forEach(function (item2, index) {
            if (item.idName === item2.idName) {
              $userList.splice(index, 1)
            }
          })
        }


      })
      $('#memberList').html('');
      $userList.forEach(function (item) {
        item.idName !== window._config.idName && $('#memberList').append('<option value="' + item.idName + '">' + item.nickName + '</option>');
      });
    },
    onGetTotalUserList: function (roomId, userList) {
      $userList = userList;
      $('#memberList').html('');
      $userList.forEach(function (item) {
        item.idName !== window._config.idName && $('#memberList').append('<option value="' + item.idName + '">' + item.nickName + '</option>');
      });
      console.log('onGetTotalUserList', roomId, userList);
    },
    onRecvRoomMsg: function (chat_data, server_msg_id, ret_msg_id) {
      console.log('onRecvRoomMsg', chat_data, server_msg_id, ret_msg_id);
    },
    onRecvReliableMessage: function (type, seq, data) {
      console.log('onRecvReliableMessage', type, seq, data);
    },
    onRecvBigRoomMessage: function (messageList, roomId) {
      console.log('onRecvBigRoomMessage', messageList, roomId);
    },
    onRecvCustomCommand: function (from_userid, from_idname, custom_content) {
      console.log('onRecvCustomCommand', from_userid, from_idname, custom_content);
    },
  }

  for (var key in _config) {
    zg[key] = _config[key]
  }

}


function leaveRoom() {
  console.info('leave room  and close stream');

  isPreviewed && zg.stopPreview(previewVideo);

  isPreviewed && zg.stopPublishingStream(_config.idName);

  for (var i = 0; i < useLocalStreamList.length; i++) {
    zg.stopPlayingStream(useLocalStreamList[i].stream_id);
  }

  useLocalStreamList = [];
  $('.remoteVideo').html('');
  isPreviewed = false;
  isLogin = false;
  zg.logout();
}

//判断浏览器是否支持webrtc功能（充分判断）
// 次方法为不严谨判断，只判断了浏览器对api的支持，根据我们的测试，在手机上情况会比较复杂，有些手机浏览器尽管api支持，但是不支持音视频h264编码，导致仍旧不支持推拉流,同一款浏览器不同手机也会出现不一致情况；
// 浏览器支持度目前处于不端完善中，具体哪些浏览器支持会在官方文档中公布 官方文档https://www.zego.im/html/document/#Live_Room/SDK_Integration_Guide:web
function isSupports() {
  var e = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection
    ,
    t = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia || navigator.mozGetUserMedia || navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    , n = window.WebSocket
  return !!e && !!t && !!n;
}


function getBrowser() {
  var ua = window.navigator.userAgent;
  var isIE = window.ActiveXObject != undefined && ua.indexOf("MSIE") != -1;
  var isFirefox = ua.indexOf("Firefox") != -1;
  var isOpera = window.opr != undefined;
  var isChrome = ua.indexOf("Chrome") && window.chrome;
  var isSafari = ua.indexOf("Safari") != -1 && ua.indexOf("Version") != -1;
  if (isIE) {
    return "IE";
  } else if (isFirefox) {
    return "Firefox";
  } else if (isOpera) {
    return "Opera";
  } else if (isChrome) {
    return "Chrome";
  } else if (isSafari) {
    return "Safari";
  } else {
    return "Unkown";
  }
}

function IsPC() {
  var userAgentInfo = navigator.userAgent;
  var Agents = new Array("Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod");
  var flag = true;
  for (var v = 0; v < Agents.length; v++) {
    if (userAgentInfo.indexOf(Agents[v]) > 0) {
      flag = false;
      break;
    }
  }
  return flag;
}

function getPcm() {
  var bufferSize = 4096;
  var audioContext;
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  } catch (e) {
    alert('Web Audio API is not supported in this browser');
  }

  // Check if there is microphone input.
  try {
    navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;
    var hasMicrophoneInput = (navigator.getUserMedia || navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia || navigator.msGetUserMedia);
  } catch (e) {
    alert("getUserMedia() is not supported in your browser");
  }

  // Create a pcm processing "node" for the filter graph.
  var bufferSize = 4096;
  var myPCMProcessingNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
  myPCMProcessingNode.onaudioprocess = function (e) {
    var input = e.inputBuffer.getChannelData(0);
    var output = e.outputBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      // Modify the input and send it to the output.
      // output[i] = input[i];
    }
  }

  var errorCallback = function (e) {
    alert("Error in getUserMedia: " + e);
  };

  // Get access to the microphone and start pumping data through the  graph.
  //     navigator.getUserMedia({audio: true}, function(stream) {
  //         // microphone -&gt; myPCMProcessingNode -&gt; destination.
  //         var microphone = audioContext.createMediaStreamSource(stream);
  //         microphone.connect(myPCMProcessingNode);
  //         myPCMProcessingNode.connect(audioContext.destination);
  //         //microphone.start(0);
  //     }, errorCallback);
  var _stream = previewVideo.captureStream();
  var microphone = audioContext.createMediaStreamSource(_stream);
  microphone.connect(myPCMProcessingNode);
  myPCMProcessingNode.connect(audioContext.destination);

}

function startRecord(param) {
  const body = JSON.stringify({
    app_id: param.appId,
    room_id: param.roomId,
    user_id: "",
    file_name: param.fileName || `${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.mp4`,
    record_config: {
      record_mode: 2,    // 单流、混流录制模式
      user_id: [],   // 用单流模式下指定用户id, 空则两个单流都录
      mix_stream_layout: [{
        role: 1,
        user_id: _config.idName,
        stream_id: "",
        top: 0,
        left: 0,
        bottom: 1080,
        right: 1920,
        layer: 0,
        watermarking_width: 0,
        watermarking_height: 0,
        watermarking_info: ""
      }, {
        role: 2,
        user_id: param.customerId,
        stream_id: "",
        top: 0,
        left: 1921,
        bottom: 1080,
        right: 1920 * 2,
        layer: 0,
        watermarking_width: 0,
        watermarking_height: 0,
        watermarking_info: ""
      }], // TODO: Need finished layout.
      muxer_stream_type: 3,          // 录制流类型，控制是否录制音视频。默认值：3,MuxerStreamTypeAudio = 1, 只录制音频、MuxerStreamTypeVideo = 2, 只录制视频 、MuxerStreamTypeBoth = 3, 录制音视频
      fragment_seconds: 2,          // 录制文件分片间隔（0~10s），默认值：0  0表示不分片,大于0表示分片
      output_audio_bitrate: 8000,          // 录制输出音频码率
      output_fps: 15,         // 录制输出视频帧率
      output_bitrate: 2000000,         // 录制输出视频码率
      output_width: 1920 * 2,   // 录制输出视频分辨率宽
      output_height: 1080,       // 录制输出视频分辨率高
      background_color: 0,   // 录制背景颜色，前三个字节为 RGB 颜色值，即 0xRRGGBBxx
      dynamic_watermarking_switch: true,       // 动态水印开关
      dynamic_watermarking_width: 1920 * 2,   // 动态水印宽度
      dynamic_watermarking_height: 40,         // 动态水印高度
      dynamic_watermarking_pos: 0           // 动态水印位置：0右上角 1左上角 2右下角 3左下角
    }
  });
  console.log(body)
  return fetch(`${apiDomain}/recorder/start`, {
    headers: { "content-type": "application/json" },
    mode: "cors",
    method: "POST",
    body
  }).then(res => res.json())
}

function stopRecord(param) {
  return fetch(`${apiDomain}/recorder/stop`, {
    headers: { "content-type": "application/json" },
    mode: "cors",
    method: "POST", body: JSON.stringify({
      app_id: param.appId,
      room_id: param.roomId,
      user_id: ""
    })
  }).then(res => (res.json()));
}

$(function () {

  console.log(ZegoClient.getCurrentVersion());
  ZegoClient.supportDetection (result => {
    console.log('检测成功',result)
    if (!result.capture) {
      alert("当前浏览器不支持获取摄像头麦克风设备")
    }
    if (!result.screenSharing) {
      alert("当前浏览器不支持屏幕捕捉")
    }
    if (!result.videoDecodeType.H264 && !result.videoDecodeType.VP8) {
      alert('当前浏览器不支持vp8与h264')
    }
  }, err => {
    alert(err)
  })

  //初始化sdk
  init();

  $('#startPreview').click(function () {
    zg.startPreview($('#previewVideo')[0], {
      video: true,
      audio: true,
      videoQuality: 1
    })
  })

  $('#loginHall').click(function () {
    openHall()
  })

  $('#logoutHall').click(function () {
    leaveRoom()
  })

  $('#createRoom').click(function () {
    zg.enterRoom($('#roomId').val(), 1, streamList => {
      isLogin = true;

      //限制房间最多人数，原因：视频软解码消耗cpu，浏览器之间能支撑的个数会有差异，太多会卡顿
      if (streamList.length >= 4) {
        alert('房间太拥挤，换一个吧！');
        leaveRoom();
        return;
      }

      useLocalStreamList = streamList;

      $('.remoteVideo').html('')
      for (var index = 0; index < useLocalStreamList.length; index++) {
        $('.remoteVideo').append($('<video  autoplay muted playsinline controls ></video>'));
        play(useLocalStreamList[index].stream_id, $('.remoteVideo video:eq(' + index + ')')[0]);
      }

      streamId = new Date().getTime() + ''

      console.log('previewConfig')

      // zg.startVideoTalk({
      //   role: 1,
      //   streamList,
      //   previewConfig: getPreviewConfig(),
      //   localVideo: previewVideo,
      //   remoteVide: $('.remoteVideo video:eq(0)')[0],
      //   streamId: streamId
      // },err => {
      //   alert(JSON.stringify(err));
      // });
      console.log(`login success`);

      loginRoom = true;


      //开始预览本地视频
      doPreviewPublish()

    }, err => {
      alert(err.code + err.msg)
    });
  })

  $('#enterRoom').click(function () {
    zg.enterRoom($('#roomId').val(), 0, streamList => {
      console.log('streamList:', streamList)

      play(streamList[0].stream_id, $('.remoteVideo video:last-child')[0]);
      streamId = new Date().getTime() + ''

      // zg.startVideoTalk({
      //   role: 0,
      //   streamList,
      //   previewConfig: getPreviewConfig(),
      //   localVideo: previewVideo,
      //   remoteVide: $('.remoteVideo video:eq(0)')[0],
      //   streamId: streamId
      // });
      // doPreviewPublish()

    }, err => {
      alert(err.code + err.msg)
    });
  })

  $('#getRoomInfo').click(function () {
    zg.getRoomInfo((err, streamInfos) => {
      if (err) {
        console.log(err)
      } else {
        console.log('streamInfos:', streamInfos)
      }
    })
  })

  $('#leaveRoom').click(function () {
    console.info('leave room  and close stream');

    zg.stopPreview(previewVideo) && zg.stopPublishingStream(_config.idName);

    for (var i = 0; i < useLocalStreamList.length; i++) {
      zg.stopPlayingStream(useLocalStreamList[i].stream_id);
    }

    useLocalStreamList = [];
    $('.remoteVideo video:eq(0)')[0].srcObject = null;
    zg.leaveRoom()
  });

  $('#stopPreview').click(function () {
    zg.stopPreview(previewVideo);
    zg.leaveRoom();
  })

  $('#toggleCamera').click(function () {
    zg.enableCamera(previewVideo, $(this).hasClass('disabled'));
    $(this).toggleClass('disabled');
  });

  $('#toggleSpeaker').click(function () {
    zg.enableMicrophone(previewVideo, $(this).hasClass('disabled'));
    $(this).toggleClass('disabled');
  });

  $('#audioList').change(function () {
    zg.setLocalAudioOutput(previewVideo, $(this).val());
  })

  $('#monitorTimer').click(function () {
    zg.setQualityMonitorCycle($('#monitor').val() * 1);
  });

  $('#extraInfo').click(function () {
    zg.updateStreamExtraInfo(_config.idName, $('#publishExtra').val());
  });

  $('#mixStream').click(function () {
    var streamList = [{
      streamId: _config.idName,
      top: 3,
      left: 3,
      bottom: 5,
      right: 5,
    }];
    useLocalStreamList.forEach(function (stream) {
      streamList.push({
        streamId: stream.stream_id,
        top: 3,
        left: 3,
        bottom: 5,
        right: 5,
      })
    })

    zg.updateMixStream({
      outputStreamId: 'choui',
      outputUrl: 'test.aliyun.zego.im/zegodemo',
      outputBitrate: 300,
      outputFps: 15,
      outputWidth: 240,
      outputHeight: 320,
      streamList: streamList
    }, function (mixStreamId, mixStreamInfo) {
      console.log('mixStreamId: ' + mixStreamId);
      console.log('mixStreamInfo: ' + JSON.stringify(mixStreamInfo));
    }, function (err, errorInfo) {
      console.log('err: ' + JSON.stringify(err));
      console.log('errorInfo: ' + JSON.stringify(errorInfo));
    });
  });

  $('#stopMixStream').click(function () {
    zg.stopMixStream({
      outputStreamId: 'choui'
    }, function () {
      console.log('stopMixStream success: ');
    }, function (err) {
      console.log('stopMixStream err: ');
      console.log(err);
    })
  });

  $('#requestJoinLive').click(function () {
    anchor_userid && zg.requestJoinLive(anchor_userid, function (seq) {
      console.log('requestJoinLive suc', seq);
    }, function (err, seq) {
      console.log('requestJoinLive err', err, seq);
    }, function (result, fromUserId, fromUserName) {
      window._fromUserId = fromUserId;
      alert(result ? '同意连麦' : '拒绝连麦');
      if (result) {
        doPreviewPublish();
      }
      console.log('requestJoinLive callback', result, fromUserId, fromUserName);
    })
  })


  $('#endJoinLive').click(function () {
    window._fromUserId && zg.endJoinLive(window._fromUserId, function (seq) {
      console.log('requestJoinLive suc', seq);
    }, function (err, seq) {
      console.log('requestJoinLive err', err, seq);
    });
    zg.stopPlayingStream(window._fromUserId);
    $('.remoteVideo').html('');
  })

  $('#inviteJoinLive').click(function () {
    $('#memberList').val() && zg.inviteJoinLive($('#memberList').val(), function (seq) {
      console.log('inviteJoinLive suc', seq);
    }, function (err, seq) {
      console.log('inviteJoinLive err', err, seq);
    }, function (result, fromUserId, fromUserName) {
      alert('同意连麦');
      //doPreviewPublish();
      console.log('inviteJoinLive callback', result, fromUserId, fromUserName);
    })
  })


  $('#screenShot').click(function () {

    if (IsPC()) {

      loginRoom && zg.stopPublishingStream(_config.idName);
      loginRoom && zg.stopPreview(previewVideo);



      var config = {
        externalMediaStream: null,
        width: 640,
        height: 480,
        frameRate: 15,
        bitRate: 1000
      };

      getBrowser() === 'Firefox' && zg.startScreenShotFirFox({
        mediaSource: 'screen',
        audio: false,
        width: 1920,
        height: 1080,
        frameRate: 5
      }, false, function (suc, mediastream) {
        console.log('startScreenShot:' + suc);
        screenCaptrue = suc;
        previewVideo.srcObject = mediastream;
        // config.externalCapture = true;
        config.externalMediaStream = mediastream;
        if (loginRoom) {
          doPreviewPublish(config);
        }
      });

      getBrowser() !== 'Firefox' && zg.startScreenSharing({
        frameRate: 10,
        audio: false
      }, function (suc, mediastream, err) {
        console.log('startScreenShot:' + suc);
        let error = err;
        let stream = mediastream;
        screenCaptrue = suc;
        if (!suc && getBrowser() === 'Chrome') {
          zg.startScreenShotChrome((suc, stream, err) => {
            screenCaptrue = suc;
            error = err;
            stream = stream;
          })
        }
        if (error) {
          alert(error);
          return;
        }
        previewVideo.srcObject = stream;
        // config.externalCapture = true;
        config.externalMediaStream = stream;
        if (loginRoom) {
          doPreviewPublish(config);
        }
      })
    }
  });

  $('#stopScreenShot').click(function () {
    zg.stopScreenShot();
    zg.stopPreview(previewVideo);
    zg.stopPublishingStream(_config.idName);

    doPreviewPublish();

  });

  $('#externalCapture').click(function () {

    isPreviewed && zg.stopPreview(previewVideo);

    isPreviewed && zg.stopPublishingStream(_config.idName);

    let mediastream = $('#extenerVideo')[0].captureStream();
    previewVideo.srcObject = mediastream;
    var config = {
      externalMediaStream: null,
      width: 640,
      height: 480,
      frameRate: 15,
      bitRate: 1000,
      externalCapture: true,
      audioBitRate: $('#audioBitRateInput').val() * 1
    };

    doPreviewPublish(config, $('#extenerVideo')[0]);
  });

  $('#sendCustomrMsg').click(function () {
    zg.sendCustomCommand([$('#memberList').val()], { isFinished: true }, (seq, customContent) => {
      console.log('sendCustomCommand suc', seq, customContent);
    }, (err, seq, customContent) => {
      console.log('sendCustomCommand err', err, seq, customContent);
    });
  });

  $('#sendRoomMsg').click(function () {
    zg.sendRoomMsg(1, 2, "test", function (seq, msgID) {
      console.log("sendRoomMsg suc:", seq, msgID);
    }, function (err, seq, msgID) {
      console.log("sendRoomMsg err:", JSON.stringify(err), seq, msgID);
    })
  });

  $('#ReliableMessage').click(function () {
    zg.sendReliableMessage('2', "ReliableMessage test", function (seq) {
      console.log("sendReliableMessage suc:", seq);
    }, function (err, seq) {
      console.log("sendReliableMessage err:", err, seq);
    })
  });

  $('#RelayMessage').click(function () {
    zg.sendRelayMessage(1, 2, "sendRelayMessage test", function (seq) {
      console.log("sendRelayMessage suc:", seq);
    }, function (err, seq) {
      console.log("sendRelayMessage err:", err, seq);
    })
  });

  $('#BigRoomMessage').click(function () {
    zg.sendBigRoomMessage(2, 1, "BigRoomMessage test", function (seq, messageId) {
      console.log("BigRoomMessage suc:", seq, messageId);
    }, function (err, seq) {
      console.log("BigRoomMessage err:", err, seq);
    })
  });

  $('#playStream').click(function () {
    zg.setCustomSignalUrl('wss://webrtctest.zego.imm/ws?a=webrtc-demo');
    $.get(tokenUrl, {
      app_id: _config.appid,
      id_name: _config.idName,
      //cgi_token: generateTokenInfo(_config.appid),
    },
      function (token) {
        if (!token) {
          alert('get token failed')
        } else {
          console.log('gettoken success');
          play('choui', $('.remoteVideo video:eq(0)')[0]);
        }
      }, 'text');

  })

  $('#getAudioInfo').click(function () {
    window.souder = ZegoClient.getAudioInfo($('.remoteVideo video:eq(0)')[0], function (e) {
      e && console.error(e);
    })
    window.souderTimer = setInterval(() => {
      console.log(souder);
    }, 2000);
  })


  $('#stopgetAudioInfo').click(function () {
    if (window.souder) {
      clearInterval(window.souderTimer);
      window.souder.stop();
    }
  });

  $('#startPublish').click(function () {
    zg.startPublishingStream(_config.idName, $('#previewVideo')[0])
  })

  $('#stopPublish').click(function () {
    zg.stopPublishingStream(_config.idName);
  })

  //防止，暴力退出（关闭或刷新页面）
  // const isOnIOS = navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPhone/i);
  // const eventName = isOnIOS ? "pagehide" : "beforeunload";
  // window.addEventListener(eventName, function (event) {
  //     window.event.cancelBubble = true; // Don't know if this works on iOS but it might!
  //     leaveRoom();
  // });

  $('#snapshot').click(function () {
    ZegoClient.takeSnapShot($('#previewVideo')[0], $('#snapshotImg')[0]);
  });

  $('#saveSnapshot').click(function () {
    ZegoClient.saveSnapShot($('#previewVideo')[0], 'zego' + new Date().getTime());
  });

  $('#startRecord').click(function () {
    // ZegoClient.startRecord($('#previewVideo')[0]);

    const config = { roomId: "test_room_idOq7QC", staffId: "test_staff_id_0XxvU", staffStreamId: "s-PplTw", customerId: "c64bd310-da6b-426e-bc0f-5201e19451a6", customerStreamId: "test_room_idOq7QC-c64bd310-da6b-426e-bc0f-5201e19451a6" };
    startRecord({
      appId: 1234567,
      roomId: $('#roomId').val(),
      customerId: recordConfig.remoteUserid,
      staffId: config.staffId
    }).then(data => {
      console.log(data);
      console.log(`http://119.23.110.90:20000${data.url}`);
    });

  });
  $('#pauseRedord').click(function () {
    //ZegoClient.pauseRecord();

    stopRecord({
      appId: 1234567,
      roomId: $('#roomId').val()
    });
  });
  $('#resumeRecord').click(function () {
    ZegoClient.resumeRecord();

  });
  $('#downloadRecord').click(function () {
    ZegoClient.saveRecord('zego' + new Date().getTime());
  });

  $('#getPCM').click(function () {
    mediaUtil = ZegoClient.getAudioInfo(previewVideo, (info) => {
      console.log(info)
    }, { type: 'pcm', bufferSize: 16384, sampleBit: 16, sampleRate: 44100 });

    mediaUtil.onReceiveBuffer = function (buf) {
      console.log('buf', buf);

      //再次压缩
      let compress = 44100 / 16000
      let oldBuf = buf.getFloat32()
      console.log('oldBuf', oldBuf)

      //获取到pcm格式 DataView, 存到数组中
      pcmList.push(buf);


      if (pcmList.length === 30) {
        //pcm格式 DataView数组，转为wav
        var wav = mediaUtil.encodeWave(pcmList);
        var blob = new Blob([wav], {
          type: 'audio/wav'
        });

        //下载wav
        funDownload(blob, (count++) + '.wav');
        pcmList = [];
      }

    }
  })


  $('#getWAV').click(function () {
    mediaUtil = ZegoClient.getAudioInfo(previewVideo, (info) => {
      console.log(info)
    }, { type: 'wav', bufferSize: 16384, sampleBit: 16, sampleRate: 16000 });

    mediaUtil.onReceiveWav = function (wavBuffer) {
      console.log('wavBuffer', wavBuffer);

    }
  })

  $('#MixAudio').click(function () {

    let result = zg.startMixingAudio(_config.idName, $('#mixAudio0')[0])

    // window.AudioContext = window.AudioContext || window.webkitAudioContext
    // let ad = new AudioContext()
    // let audio = $('#mixAudio')[0]
    // let stream = $('#previewVideo')[0].srcObject

    // let mediaSource = ad.createMediaStreamSource(stream)
    // elementSource = ad.createMediaElementSource(audio)
    // gainNode = ad.createGain()
    // let destination = ad.createMediaStreamDestination()

    // mediaSource.connect(gainNode)
    // elementSource.connect(gainNode)
    // gainNode.connect(destination)


    // $('#mixStreamAudio')[0].srcObject = destination.stream
    // audioTrack = destination.stream.getAudioTracks()[0]

    // //RTCRtpSender​.replace​Track
    // let senders = zg.streamCenter.publisherList[_config.idName].publisher.peerConnection.getSenders()
    // let sender = senders.find(s => s.track.kind === audioTrack.kind)
    // console.log('found sender:', sender)

    // sender.replaceTrack(audioTrack)

    // console.log(audioTrack)

    // PCs.forEach(function(pc) {
    //   var sender = pc.getSenders().find(function(s) {
    //     return s.track.kind == videoTrack.kind;
    //   });
    //   console.log('found sender:', sender);
    //   sender.replaceTrack(videoTrack);
    // });
  })

  $('#stopMixAudio').click(function () {
    zg.stopMixingAudio(_config.idName)
  })

  $('#preloadEffect').click(function () {

    zg.preloadEffect(1, './laugh2.mp3', err => {
      if (err) {
        alert('失败' + err)
      } else {
        alert('预加载成功')
      }
    })

  })

  $('#playEffect').click(function () {

    zg.playEffect({
      streamId: _config.idName,
      effectId: 1,
      loop: false,
      replace: false
    }, () => {
      console.warn('play effect success')
    }, () => {
      console.warn('play end')
    })
  })

  $('#pauseEffect').click(function () {
    zg.pauseEffect(_config.idName)
  })

  $('#resumeEffect').click(function () {
    zg.resumeEffect(_config.idName)
  })

  $('#unloadEffect').click(function () {
    zg.unloadEffect(1) && alert('删除成功')
  })

  $('#testMixAudio').click(function () {
    let ac = new AudioContext()
    let localStream = $('#previewVideo')[0].srcObject
    let destination = ac.createMediaStreamDestination()
    let streamSource = ac.createMediaStreamSource(localStream)
    streamSource.connect(destination)
    destination.stream.addTrack(localStream.getVideoTracks()[0])
    console.log(destination.stream.getAudioTracks()[0].getSettings(), audioTrack.getSettings())
    let audioTrack = localStream.getAudioTracks()[0]

    //$('#previewVideo')[0].srcObject = destination.stream
    // localStream.removeTrack(audioTrack)
    // localStream.addTrack(audioTrack)
  })

});

function setConfig(zg) {
  //测试用代码，客户请忽略  start
  if (location.search) {
    let _arr_config = location.search.substr(1).split('&');
    _arr_config.forEach(function (item) {
      var key = item.split('=')[0], value = item.split('=')[1];

      if (value && _config.hasOwnProperty(key)) {
        _config[key] = decodeURIComponent(value);
      } else if (key == 'tokenUrl' && value) {
        tokenUrl = value
      } else if (key == 'apiDomain' && value) {
        apiDomain = value
      }
    });
  }
  //测试用代码，客户请忽略  end

  //console.log('tokenUrl:' + tokenUrl)
  console.log("config param:" + JSON.stringify(_config));

  _config.appid = _config.appid * 1;
  _config.testEnvironment = !!(_config.testEnvironment * 1);
}

