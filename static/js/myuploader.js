/**
 * Created by Administrator on 7/20/2017.
 */
'use strict';

jQuery(function () {
  var sysOptions = {
    multiple: false,  // 为true表示允许一次提交多个文件， 为false表示一次只允许提交一个文件，当再次选择文件时会将之前选择的文件覆盖掉
    maxFileCount: 10  //允许最大文件的个数，当设置为-1时表示不限制, 该选项在multiple设置为true时才有效
  }

  var app = new Vue({
    el: '#app',
    data: {
      multiple: sysOptions.multiple,
      files: [],
      uploadBtnTitle: "提交"
    },
    methods: {
      upload: function () {
        if (this.files.length == 0) {
          alert("请先选择需要上传的文件!");
          return;
        }

        if (this.uploadBtnTitle != "提交") {
          alert("文件正在处理中,请稍等...");
          return;
        }

        for (var i in this.files) {
          var file = this.files[i];

          //找到第一个状态是未上传的文件并进行上传操作
          if (!file.uploaded) {
            uploader.upload(file.id);
            break;
          }
        }
      }
    }
  });

  app.fileMap = {};
  var uploader;

  /***************************************************** 监听分块上传过程中的三个时间点 start ***********************************************************/
  WebUploader.Uploader.register({
      "before-send-file": "beforeSendFile",//整个文件上传前
      "before-send": "beforeSend",  //每个分片上传前
      "after-send-file": "afterSendFile"  //分片上传完毕
    },
    {
      /**时间点1：所有文件进行上传之前调用此函数*/
      beforeSendFile: function (file) {

      },
      /**时间点2：如果有分块上传，则每个分块上传之前调用此函数*/
      beforeSend: function (block) {
        var deferred = WebUploader.Deferred();
        var fileInfo = app.fileMap[block.file.id];

        $.ajax({
          type: "POST",
          url: "restful/fileUpload/checkChunk",  //ajax验证每一个分片
          data: JSON.stringify({
            fileName: fileInfo.name,            //文件的名称
            filePercent: fileInfo.percent,      // 文件的上传进度百分比
            fileMd5: fileInfo.md5,              // 文件的md5值
            fileSize: fileInfo.size,            // 文件的大小
            chunkNum: block.chunk,              // 当前分块下标
            chunkTotal: block.chunks,           // 总分块数
            chunkSize: block.end - block.start  //当前分块大小
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          success: function (response) {
            if (response.status == "success") {
              var content = response.content;

              if (content.isExist) {
                //分块存在，跳过
                deferred.reject();
              } else {
                //分块不存在或不完整，重新发送该分块内容
                deferred.resolve();
              }
            } else {
              alert(response.content.message);
              uploader.stop(true); //中断上传任务
              deferred.reject();
            }
          }
        });

        return deferred.promise();
      },
      /**时间点3：所有分块上传成功后调用此函数*/
      afterSendFile: function (file) {
        var fileInfo = app.fileMap[file.id];

        //如果分块上传成功，则通知后台合并分块
        $.ajax({
          type: "POST",
          url: "restful/fileUpload/mergeChunk",  //ajax将所有片段合并成整体
          data: JSON.stringify({
            fileName: fileInfo.name,
            fileMd5: fileInfo.md5,
            fileSize: fileInfo.size,
            fileType: fileInfo.type
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          success: function (response) {
            if (response.status == "success") {
              fileInfo.uploaded = true;

              for (var i in app.files) {
                var file = app.files[i];

                //找到第一个状态是未上传的文件并进行上传操作
                if (!file.uploaded) {
                  uploader.upload(file.id);
                  break;
                }
              }
            } else {
              alert(response.content.message);
              uploader.stop(true); //中断上传任务
            }
          }
        });
      }
    });
  /***************************************************** 监听分块上传过程中的三个时间点 end **************************************************************/

  /************************************************************ 初始化WebUploader start ******************************************************************/
  var uploaderOptions = {
    auto: false,                  // 选择文件后是否自动上传
    chunked: true,                // 开启分片上传
    chunkSize: 10 * 1024 * 1024,  // 单个分片文件的大小为10M
    chunkRetry: 3,                // 如果某个分片由于网络问题出错，允许自动重传多少次
    threads: 3,                   // 上传并发数。允许同时最大上传进程数[默认值：3]
    duplicate: false,             // 是否重复上传（同时选择多个一样的文件），true可以重复上传
    prepareNextFile: true,        // 上传当前分片时预处理下一分片
    swf: 'js/Uploader.swf',       // swf文件路径
    server: 'restful/fileUpload/uploadChunk',// 文件接收服务端
    fileSizeLimit: 100 * 1024 * 1024 * 1024,        // 100G 验证文件总大小是否超出限制, 超出则不允许加入队列
    fileSingleSizeLimit: 10 * 1024 * 1024 * 1024,   // 10G 验证单个文件大小是否超出限制, 超出则不允许加入队列
    pick: {
      id: '#picker',  //这个id是你要点击上传文件按钮的外层div的id
      multiple: true //true表示可以在文件选择窗口一次选择多个文件
    },
    resize: false,    //不压缩image, 默认如果是jpeg，文件上传前会先压缩再上传！
    accept: {
      //允许上传的文件后缀，不带点，多个用逗号分割
      extensions: "exe,txt,jpg,jpeg,bmp,png,zip,rar,war,pdf,cebx,doc,docx,ppt,pptx,xls,xlsx,iso"
      //限制mimeType, 在chrome浏览器上限制mimetype时打开文件选择器非常慢，故将该限制注释掉
      //mimeTypes: '.exe,.txt,.jpg,.jpeg,.bmp,.png,.zip,.rar,.war,.pdf,.cebx,.doc,.docx,.ppt,.pptx,.xls,.xlsx',
    }
  };

  uploader = WebUploader.create(uploaderOptions);
  /************************************************************ 初始化WebUploader end ********************************************************************/

  /**
   * 当文件被加入到传输队列时调用，方便对进行相应的校验处理
   */
  uploader.on('beforeFileQueued', function (file) {
    if (!sysOptions.multiple) {
      //系统不允许上传多个文件
      uploader.reset();　//重置文件队列
      app.files = [];
    } else if (uploader.getFiles().length >= sysOptions.maxFileCount) {
      alert("一次上传文件个数不过超过系统限制的最大值("
        + sysOptions.maxFileCount + "个)")

      return false;
    }

    //限制单个文件的大小 超出了进行提示
    if (file.size > uploaderOptions.fileSingleSizeLimit) {
      alert("单个文件大小不能超过系统限制的最大值("
        + (uploaderOptions.fileSingleSizeLimit / (1024 * 1024 * 1024)) + "G)");

      return false;
    }
  })

  /**
   * 当有文件被添加进队列的时候（点击上传文件按钮，弹出文件选择框，选择完文件点击确定后触发的事件）
   */
  uploader.on('fileQueued', function (file) {
    var fileInfo = {
      name: file.name,
      percent: 0,
      size: file.size,
      type: file.type,
      lastModifiedDate: file.lastModifiedDate,
      md5: "",
      uploaded: false,
      uploadFileId: "",
      progressStyle: {
        width: "0%"
      }
    };

    app.files.push(fileInfo);
    app.fileMap[file.id] = fileInfo;

    var deferred = WebUploader.Deferred();
    app.uploadBtnTitle = "请稍等...";
    fileInfo.percent = "校验中...0";

    /**
     * 计算文件的唯一标记fileMd5，用于断点续传
     * 如果.md5File(file)方法里只写一个file参数则计算MD5值会很慢 所以加了后面的参数：10*1024*1024
     * 即只根据文件的部分值进行MD5值的计算，可靠性没有全文件计算的高
     */
    (new WebUploader.Uploader())
      .md5File(file, 0, 1 * 1024 * 1024)
      .progress(function (percentage) {
        //fileInfo.md5 = "正在读取文件...已完成" + Math.round(percentage * 100) + "%";
        fileInfo.percent = "校验中..." + Math.round(percentage * 100);
      })
      .then(function (md5) {
        fileInfo.md5 = md5;

        //在后台校验文件是否已上传过，已上传完成则返回文件编码，部分上传完成则返回上传到哪一个分片，以及上传进度值
        $.ajax({
          type: "POST",
          url: "restful/fileUpload/checkFile",  //先检查该文件是否上传过，如果上传过，上传进度是多少
          data: JSON.stringify({
            fileName: fileInfo.name,  //文件名
            md5: fileInfo.md5,
            size: fileInfo.size
          }),
          cache: false,
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          success: function (response) {
            if (response.status == "success") {
              var content = response.content;

              if (content.isExist) {
                //将该文件的状态设置为已上传完成
                fileInfo.percent = 100;
                fileInfo.progressStyle.width = "100%";
                fileInfo.uploaded = true;
                fileInfo.uploadFileId = content.uploadFileId;
              } else {
                fileInfo.percent = content.percent;
                fileInfo.progressStyle.width = content.percent + "%";
              }

              app.uploadBtnTitle = "提交";
              //获取文件信息后进入下一步
              deferred.resolve();
            } else {
              alert(response.content.message);
              uploader.stop(true); //中断上传任务
              deferred.reject();
            }
          }
        });
      });

    return deferred.promise();
  });

  /**
   * 当某个文件的分块在发送前触发
   * block: 分块信息
   * data: 默认的上传参数，可以扩展此对象来控制上传参数
   * headers:可以扩展此对象来控制上传头部,默认是空对象
   */
  uploader.on("uploadBeforeSend", function (block, data, headers) {
    var fileInfo = app.fileMap[block.file.id];

    if (typeof data.chunk == "undefined") {
      data.chunk = block.chunk;
    }

    if (typeof data.chunks == "undefined") {
      data.chunks = block.chunks;
    }

    data.fileMd5 = fileInfo.md5;
    data.percent = fileInfo.percent;
    data.fileSize = fileInfo.size;
  });

  /**
   * 当某个文件的分块上传到服务端响应后，会派送此事件来询问服务端响应是否有效
   * 如果此事件handler返回值为false, 则此文件将派送server类型的uploadError事件。
   *
   * block: 分块信息
   * rsp: 服务端的返回数据，json格式，如果服务端不是json格式，从ret._raw中取数据，自行解析。
   */
  uploader.on("uploadAccept", function (block, rsp) {
    if (rsp.status == "success") {
      return true;
    } else {
      alert(rsp.message);
      return false;
    }
  })

  /**
   * 文件上传过程中创建进度条实时显示
   */
  uploader.on('uploadProgress', function (file, percentage) {
    var fileInfo = app.fileMap[file.id];
    var currentPercent = fileInfo.percent;
    var percent = Math.round(percentage * 100);

    if (percent > currentPercent) {
      fileInfo.percent = percent;
      fileInfo.progressStyle.width = percent + "%";
    }
  });

  /**
   * 上传成功后执行的方法
   */
  uploader.on('uploadSuccess', function (file) {

  });

  /**
   * 上传出错后执行的方法
   * file:File对象
   * reason:出错的code
   */
  uploader.on('uploadError', function (file, reason) {
    uploader.stop(true);
    console.log("Upload Error: " + reason);
  });

  /**
   * 文件上传成功失败都会走这个方法
   */
  uploader.on('uploadComplete', function (file) {

  });

  /**
   * 发生错误时将错误码输入到控制台方便定位问题
   */
  uploader.on('error', function (error) {
    if (error == 'Q_TYPE_DENIED') {
      alert("不支持该文件格式!");
    } else {
      console.log("发生未知错误，错误码：" + error);
    }
  })


  uploader.on('all', function (type) {
    //console.log("all event listener: type is " + type);
  });
});
