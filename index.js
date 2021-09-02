// import {ZegoClient} from "../sdk/wechatMini/zego.client.wechat";
var zg,
  now = new Date().getTime(),
  _config = {
    "appid": 1234567,
    "deviceId": 'deviceid01',
    "deviceType": '',
    "anType": 0,   //Area Network Type. 0,外网接入；1,内网接入
    "idName": '' + new Date().getTime(),
    "nickName": 'u' + now,
    //"server": serverEnv.h5,
    "dispatchServer": 'https://test.zegonetwork.com:1143/dispatch/connection',
    "logLevel": 100,
    "logUrl": "",
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
  musicIndex = 0,
  $userList = [],
  userRole = 1, // 全局存一份角色
  _fromUserId;
streamId = _config.idName
let apiDomain = "https://test.zegonetwork.com:1143";
recordConfig = {
  remoteUserid: '',

}

function init() {
  previewVideo = $('#previewVideo')[0];

  zg = new ZegoClient();
  // debugger;
  var version = ZegoClient.getCurrentVersion();
  console.info(version);
  setConfig(zg);
  console.log("初始化sdk");
  const buffer = zg.audioMixing.ac.createBuffer(1, 1, zg.audioMixing.ac.sampleRate);
  console.log("创建buffer");
  const sample = zg.audioMixing.ac.createBufferSource();
  console.log("创建buffer源");
  sample.buffer = buffer;
  console.log("buffer赋值");
  sample.connect(zg.audioMixing.ac.destination);
  console.log("connect");
  sample.start();
  console.log("开始混音");
  console.log("config param:" + JSON.stringify(_config));

  zg.config(_config);

  zg.setTurnOverTcpOnly($('#turnOverTcpOnly').val() * 1 ? true : false);

  enumDevices();

  // 监听sdk回掉
  listen();
}

function openHall() {
  tokenUrl = "https://test.zegonetwork.com:1143/logintoken";

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
      loginToken = res.login_token
      zg.login(loginToken, () => {
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
    "width": 480,
    "height": 640,
    "frameRate": 15,
    "bitRate": $('#videoBitRateInput').val() * 1,
    audioBitRate: $('#audioBitRateInput').val() * 1,
    noiseSuppression: $('#noiseSuppression').val() === '1' ? true : false,
    //    noiseSuppression: true,
    autoGainControl: $('#autoGainControl').val() === '1' ? true : false,
    echoCancellation: $('#echoCancellation').val() === '1' ? true : false,
    //    autoGainControl: true,
    //    echoCancellation: true,

  };
  previewConfig = $.extend(previewConfig, config);
  console.log('previewConfig', previewConfig);
  console.log('autoGainControl', $('#autoGainControl').val() === '1' ? true : false,);
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
    "videoInput": $('#videoList').val() ? $('#videoList').val() : null,
    "videoQuality": $('#videoQuality').val() ? $('#videoQuality').val() * 1 : 2,
    "horizontal": true,
    "externalCapture": false,
    "externalMediaStream": null,
    "width": $('#width').val() * 1,
    "height": $('#height').val() * 1,
    "frameRate": $('#frameRate').val() * 1,
    "bitRate": $('#videoBitRateInput').val() * 1,
    audioBitRate: $('#audioBitRateInput').val() * 1,
    //    noiseSuppression: true,
    noiseSuppression: $('#noiseSuppression').val() === '1',
    autoGainControl: $('#autoGainControl').val() === '1',
    echoCancellation: $('#echoCancellation').val() === '1'
    //    autoGainControl: true,
    //    echoCancellation: true
  }
}

//推流
function publish() {
  var videoCodeType = $('#videoCodeType').val();
  console.log('autoGainControl', $('#autoGainControl').val() === '1' ? true : false,);
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
      console.info("#" + streamid + "#" + "publish " + " audio: " + quality.audioBitrate + " video: " + quality.videoBitrate + " fps: " + quality.videoFPS);
    },

    onPlayQualityUpdate: function (streamid, quality) {
      console.log(quality)
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

    // onStreamUpdated: function (type, streamList) {
    //   if (type == 0) {
    //     for (var i = 0; i < streamList.length; i++) {
    //       console.info(streamList[i].stream_id + ' was added');
    //       useLocalStreamList.push(streamList[i]);
    //       if (streamType !== 1) {
    //         $('.remoteVideo').append($('<video  autoplay muted playsinline controls></video>'));
    //         play(streamList[i].stream_id, $('.remoteVideo video:last-child')[0]);
    //       }
    //     }

    //   } else if (type == 1) {
    //     for (var k = 0; k < useLocalStreamList.length; k++) {
    //       for (var j = 0; j < streamList.length; j++) {
    //         if (useLocalStreamList[k].stream_id === streamList[j].stream_id) {
    //           zg.stopPlayingStream(useLocalStreamList[k].stream_id);
    //           console.info(useLocalStreamList[k].stream_id + 'was devared');
    //           useLocalStreamList.splice(k, 1);
    //           $('.remoteVideo video:eq(' + k + ')').remove();
    //           break;
    //         }
    //       }
    //     }
    //   }
    // },

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
  $('.remoteVideo').html('<video  autoplay muted playsinline controls></video>');
  isPreviewed = false;
  isLogin = false;

  // zg.clear(); // 清理白板资源
  zg.logout();
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

function startRecord(param) {
  const body = JSON.stringify({
    app_id: param.appId,
    room_id: param.roomId,
    user_id: "",
    file_name: param.fileName || `${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.mp4`,
    record_config: {
      record_mode: 3,    // 单流、混流录制模式
      user_id: [],   // 用单流模式下指定用户id, 空则两个单流都录
      single_stream_config: [{
        muxer_stream_type: 3,
        user_id: _config.idName,
        stream_id: _config.idName,
        file_name: "single-" + _config.idName + ".mp4"
      }],
      mix_stream_layout: [{
        role: 1,
        user_id: _config.idName,
        stream_id: "",
        top: 0,
        left: 0,
        bottom: 720,
        right: 1280,
        layer: 0,
        watermarking_width: 0,
        watermarking_height: 0,
        watermarking_info: ""
        //      },
        // {
        //        role: 2,
        //        user_id: param.customerId,
        //        stream_id: "",
        //        top: 0,
        //        left: 1281,
        //        bottom: 720,
        //        right: 1280 * 2,
        //        layer: 0,
        //        watermarking_width: 0,
        //        watermarking_height: 0,
        //        watermarking_info: ""
      }], // TODO: Need finished layout.
      muxer_stream_type: 3,          // 录制流类型，控制是否录制音视频。默认值：3,MuxerStreamTypeAudio = 1, 只录制音频、MuxerStreamTypeVideo = 2, 只录制视频 、MuxerStreamTypeBoth = 3, 录制音视频
      fragment_seconds: 0,          // 录制文件分片间隔（0~10s），默认值：0  0表示不分片,大于0表示分片
      output_audio_bitrate: 8000,          // 录制输出音频码率
      output_fps: 15,         // 录制输出视频帧率
      output_bitrate: 1700000,         // 录制输出视频码率
      output_width: 1280,   // 录制输出视频分辨率宽
      output_height: 720,       // 录制输出视频分辨率高
      background_color: 0,   // 录制背景颜色，前三个字节为 RGB 颜色值，即 0xRRGGBBxx
      dynamic_watermarking_switch: true,       // 动态水印开关
      dynamic_watermarking_width: 1280,   // 动态水印宽度
      dynamic_watermarking_height: 720,         // 动态水印高度
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
  const body = JSON.stringify({
    app_id: param.appId,
    room_id: param.roomId,
    user_id: ""
  });
  console.log("stoprecord", body);
  return fetch(`${apiDomain}/recorder/stop`, {
    headers: { "content-type": "application/json" },
    mode: "cors",
    method: "POST",
    body
  }).then(res => res.json());
}

$(function () {

  console.log(ZegoClient.getCurrentVersion());
  ZegoClient.supportDetection(result => {
    console.log(result)
    if (!result.capture) {
      alert("当前浏览器不支持获取摄像头麦克风设备")
    }
    if (!result.screenSharing) {
      alert("当前浏览器不支持屏幕捕捉")
    }
    if ((result.videoDecodeType.H264 || result.videoDecodeType.VP8) && result.webRtc) {


      //初始化sdk
      init();

      $('#loginHall').click(function () {
        openHall()
      })

      $('#logoutHall').click(function () {
        leaveRoom()
      })

      $('#createRoom').click(function () {
        //以坐席角色创建房间
        zg.enterRoom($('#roomId').val(), 1, streamList => {
          isLogin = true;

          //限制房间最多人数，原因：视频软解码消耗cpu，浏览器之间能支撑的个数会有差异，太多会卡顿
          if (streamList.length >= 4) {
            alert('房间太拥挤，换一个吧！');
            leaveRoom();
            return;
          }


          console.log('previewConfig', getPreviewConfig())
          console.log(`login success`);

          loginRoom = true;

          console.log(streamList)
          // $('.remoteVideo').html('')
          // for (var index = 0; index < streamList.length; index++) {
          //   $('.remoteVideo').append($('<video  autoplay muted playsinline controls ></video>'));
          //   play(streamList[index].stream_id, $('.remoteVideo video:eq(' + index + ')')[0]);
          // }

          streamId = new Date() + '';
          //开始预览本地视频
          doPreviewPublish()

          // startVideoTalk({
          //   role: 1,
          //   streamList,
          //   previewConfig: getPreviewConfig(),
          //   localVideo: previewVideo,
          //   remoteVideo: $('.remoteVideo video:eq(0)')[0],
          //   streamId: streamId
          // }, err => {
          //   alert(JSON.stringify(err));
          // });

        }, err => {
          alert(err.code + err.msg)
        });

      })

      $('#enterRoom').click(function () {
        console.log("第一次", zg.ac.state);
        zg.enterRoom($('#roomId').val(), 0, streamList => {
          console.log('streamList:', streamList)

          //play(streamList[0].stream_id, previewVideo);

          // var result = zg.startPlayingStream(streamList[0].stream_id, $('.remoteVideo video:last-child')[0], '', {
          //   //playType: 'all',
          //   videoDecodeType: 'H264'
          // });

          // streamId = new Date().getTime() + ''

          // if (!result) {
          //   alert('哎呀，播放失败啦');
          //   video.style = 'display:none';
          //   console.error("play " + el.nativeElement.id + " return " + result);

          // } else {
          //   $('.remoteVideo video:last-child')[0].muted = false;
          // }

          startVideoTalk({
            role: 0,
            streamList,
            previewConfig: getPreviewConfig(),
            localVideo: previewVideo,
            remoteVideo: $('.remoteVideo video:eq(0)')[0],
            streamId: streamId
          });

        }, err => {
          alert(err.code + err.msg)
        });


      })


      $('#listenRoom').click(function () {
        zg.enterRoom($('#roomId').val(), 2, streamList => {

          useLocalStreamList = streamList;

          $('.remoteVideo').html('<video  autoplay muted playsinline controls></video>')
          for (var index = 0; index < useLocalStreamList.length; index++) {
            $('.remoteVideo').append($('<video  autoplay muted playsinline controls ></video>'));
            let { stream_id, extra_info } = useLocalStreamList[index];
            let videoCodeType = extra_info ? JSON.parse(extra_info).videoCodeType : 'H264';
            zg.startPlayingStream(stream_id, $('.remoteVideo video:eq(' + index + ')')[0], '', {
              videoDecodeType: videoCodeType || 'H264'
            });
          }
          console.log(`login success`);


          zg.onStreamUpdated = (type, streamList) => {
            if (type == 0) {
              for (var i = 0; i < streamList.length; i++) {
                console.info(streamList[i].stream_id + ' was added');
                //recordConfig.remoteUserid = streamList[0].user_id
                useLocalStreamList.push(streamList[i]);
                $('.remoteVideo').append($('<video  autoplay muted playsinline controls></video>'));
                let { stream_id, extra_info } = useLocalStreamList[index];
                let videoCodeType = extra_info ? JSON.parse(extra_info).videoCodeType : 'H264';
                zg.startPlayingStream(stream_id, $('.remoteVideo video:eq(' + index + ')')[0], '', {
                  videoDecodeType: videoCodeType || 'H264'
                });
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
          }
        })
      })
      $('#audioMix').click(function () {
        //debugger;
        // var url = './assets/applaud.mp3';
        //var url = 'https://bpic.588ku.com/audio_copy/audio/18/08/24/9841faee97016cdd91720970fd984204.mp3';
        var url1 = 'https://kfjigou.yjbtest.com:9999/api/mp3/box.mp3';
        var musicUrl = new Array();
        musicUrl[0] = "https://experience.zegonetwork.com/blink.mp3";
        musicUrl[1] = "https://experience.zegonetwork.com/mouth.mp3";
        musicUrl[2] = "https://experience.zegonetwork.com/node.mp3";
        musicUrl[3] = "https://experience.zegonetwork.com/shake.mp3";
        if (musicIndex <= 3) {
          var audioMixConfig = {
            streamId: _config.idName,
            effectId: musicIndex + 1,
            replace: true
          }
          zg.preloadEffect(musicIndex + 1, musicUrl[musicIndex], () => {
            console.log("混音按钮状态:" + zg.ac.state);
            console.log('music preolad');
            zg.playEffect(audioMixConfig, () => {
              console.warn('start play')
              console.log("正在混音:" + zg.ac.state + musicUrl[musicIndex]);
            }, () => {
              console.warn('play end');
              zg.unloadEffect(musicIndex, _config.idName);
              console.log("混音结束后:" + zg.ac.state);
              musicIndex++;
            })
          }, (err) => { console.log("混音加载异常:" + err) });
        } else {
          console.log("混音结束并且清零");
          musicIndex = 0;
          //                zg.playEffect(audioMixConfig, () => {
          // 		  console.warn('start play')
          //		  console.log("正在混音:" + zg.ac.state + musicUrl[musicIndex]);
          //  });
        }
      });

      $('#startPublishing').click(function () {
        if (loginRoom) {
          console.warn('开始推流');
          zg.startPreview(previewVideo, getPreviewConfig());
          publish();
        }
      });


      $('#stopPublishing').click(function () {
        zg.stopPublishingStream(_config.idName);
        console.warn('已停止推流');
      });

      $('#leaveRoom').click(function () {
        console.info('leave room  and close stream');

        zg.stopPreview(previewVideo) && zg.stopPublishingStream(_config.idName);

        for (var i = 0; i < useLocalStreamList.length; i++) {
          zg.stopPlayingStream(useLocalStreamList[i].stream_id);
        }

        useLocalStreamList = [];
        $('.remoteVideo').html('<video  autoplay muted playsinline controls></video>');
        zg.leaveRoom()
      });


      $('#screenShot').click(function () {

        if (IsPC()) {
          loginRoom && zg.stopPreview(previewVideo);
          loginRoom && zg.stopPublishingStream(_config.idName);

          var config = {
            externalMediaStream: null,
            width: 640,
            height: 480,
            frameRate: 15,
            bitRate: 1000
          };

          getBrowser() === 'Firefox' && zg.startScreenShotFirFox({ mediaSource: 'window', audio: false }, function (suc, mediastream) {
            console.log('startScreenShot:' + suc);
            screenCaptrue = suc;
            previewVideo.srcObject = mediastream;
            // config.externalCapture = true;
            config.externalMediaStream = mediastream;
            if (loginRoom) {
              doPreviewPublish(config);
            }
          });

          getBrowser() !== 'Firefox' && zg.startScreenSharing(false, function (suc, mediastream, err) {
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

      $('#snapshot').click(function () {
        ZegoClient.takeSnapShot($('#previewVideo')[0], $('#snapshotImg')[0]);
      });

      //防止，暴力退出（关闭或刷新页面）
      // const isOnIOS = navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPhone/i);
      // const eventName = isOnIOS ? "pagehide" : "beforeunload";
      // window.addEventListener(eventName, function (event) {
      //     window.event.cancelBubble = true; // Don't know if this works on iOS but it might!
      //     leaveRoom();
      // });

      $('#startRecord').click(function () {
        // ZegoClient.startRecord($('#previewVideo')[0]);

        const config = { roomId: "test_room_idOq7QC", staffId: "test_staff_id_0XxvU", staffStreamId: "s-PplTw", customerId: "c64bd310-da6b-426e-bc0f-5201e19451a6", customerStreamId: "test_room_idOq7QC-c64bd310-da6b-426e-bc0f-5201e19451a6" };
        startRecord({
          appId: _config.appid,
          roomId: $('#roomId').val(),
          customerId: recordConfig.remoteUserid,
          staffId: config.staffId
        }).then(data => {
          console.log(data);
          console.log(`${apiDomain}${data.url}`);
        });

      });
      $('#pauseRedord').click(function () {
        //ZegoClient.pauseRecord();

        stopRecord({
          appId: _config.appid,
          roomId: $('#roomId').val()
        });
      });

    }
  }, err => {
    alert("不支持222");
    alert(err)
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

function startVideoTalk({
  role,
  streamList,
  previewConfig,
  localVideo,
  remoteVideo,
  streamId
}, errCallBack) {
  let publishTryCount = 0;

  userRole = role;

  // getBoardFirst(); // 获取房间当前已有的白板, board.js

  //座席端
  if (role === 1) {     //坐席端
    //预览
    zg.startPreview(localVideo, previewConfig, () => {
      // 客户已经推流
      isPreviewed = true;
      if (streamList && streamList.length > 0) {
        let { stream_id, extra_info } = streamList[0];
        let videoCodeType = extra_info ? JSON.parse(extra_info).videoCodeType : 'H264';
        //拉取用户端流
        recordConfig.remoteUserid = streamList[0].user_id
        console.log("1收到流更新了,流名是:" + stream_id)

        zg.startPlayingStream(stream_id, remoteVideo, '', {
          videoDecodeType: videoCodeType || 'H264'
        });
        //remoteVideo.muted = false;
        //根据用户端的流附加消息进行推流
        zg.startPublishingStream(streamId, localVideo, extra_info, {
          videoDecodeType: videoCodeType || 'H264'
        });
        console.log("推流了:" + streamId)
      }  // 等待客户推流
      zg.onStreamUpdated = (type, streamListAfter) => {
        let { stream_id, extra_info } = streamListAfter[0];
        let videoCodeType = extra_info ? JSON.parse(extra_info).videoCodeType : 'H264';
        if (type == 0) {
          // 拉去用户端流
          console.log("2收到流更新了,流名是:" + stream_id)
          recordConfig.remoteUserid = streamListAfter[0].user_id
          zg.startPlayingStream(stream_id, remoteVideo, '', {
            videoDecodeType: videoCodeType || 'H264'
          });
          // remoteVideo.muted = false;
          // 根据用户端的流附加消息进行推流
          zg.startPublishingStream(streamId, localVideo, extra_info, {
            videoDecodeType: videoCodeType || 'H264'
          });
        } else {
          // 收到流删除后停止拉流并退出
          //		  alert("对方已退出房间,已自动关闭此房间");
          //         leaveRoom();
        }
      }

    }, (err) => {
      console.error('预览失败', err);
    });


  } else if (role === 0) { // 用户端

    // 直接推流
    ZegoClient.supportVideoCodeType(({
      H264,
      VP8,
      Vp9,
      H265
    }) => {
      // 开启预览
      zg.startPreview(localVideo, previewConfig, () => {
        isPreviewed = true;
        let videoCodeType = VP8 ? 'VP8' : (H264 ? 'H264' : null);
        //        let videoCodeType = 'H264';
        if (videoCodeType) {
          const extraInfo = { videoCodeType };
          // 根据检测结果选择推流的编码格式并带上流附加消息
          zg.startPublishingStream(streamId, localVideo, JSON.stringify(extraInfo), {
            videoDecodeType: videoCodeType
          });
        } else {
          console.error('没有可用视频编码类型');
        }

      }, (err) => {
        console.error('预览失败', err);
      });

      zg.onStreamUpdated = (type, streamListAfter) => {
        if (type == 0) {
          recordConfig.remoteUserid = streamListAfter[0].user_id
          let { stream_id, extra_info } = streamListAfter[0];
          let videoCodeType = extra_info ? JSON.parse(extra_info).videoCodeType : 'H264';
          zg.startPlayingStream(stream_id, remoteVideo, '', {
            videoDecodeType: videoCodeType
          });
          // remoteVideo.muted = false;
        } else {
          // 收到流删除后退出
          leaveRoom();
        }
      }

      zg.onPublishStateUpdate = (type, streamid, error) => {

        console.log("type == " + type);
        console.log("streamid == " + streamid)
        console.log("error == " + error);

        if (type === 1 && publishTryCount === 0) {
          publishTryCount++;
          let videCodeType = H264 ? 'H264' : (VP8 ? 'VP8' : null);
          if (videCodeType) {
            zg.stopPublishingStream(streamid);
            const extraInfo = { videCodeType };
            zg.startPublishingStream(streamId, localVideo, JSON.stringify(extraInfo), {
              videoDecodeType: videCodeType
            });
          } else {
            console.error('没有可用视频编码类型');
          }
        }


        if (type == 0) {
          // 混音
          var audioMixConfig = {
            streamId: _config.idName,
            effectId: 1,
            loop: false,
            replace: true
          }
          // var url = './assets/applaud.mp3';
          //var url = 'https://bpic.588ku.com/audio_copy/audio/18/08/24/9841faee97016cdd91720970fd984204.mp3';
          var url = 'https://kfjigou.yjbtest.com:9999/api/mp3/blink.mp3';
          //          zg.preloadEffect(1, url, ()=> {
          //            console.log('music preolad');
          //         console.log("加入房间混音状态:" + zg.ac.state);
          //            zg.playEffect(audioMixConfig, () => {
          //              console.warn('start play')
          //            console.log("正在混音:" + zg.ac.state);
          //            }, () => {
          //              console.warn('play end');
          //           console.log("混音结束后:" + zg.ac.state);
          //             zg.unloadEffect(1,_config.idName);
          //           })
          //         });
        }
      }

      // 	    zg.unloadEffect(1,_config.idName);
    }, () => {
      console.error('获取 sdp 失败');
    });

  } else {
    console.error('场景不适用');
  }
}


