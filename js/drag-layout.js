'use strict';

;(function ($, window, document, undefined) {
  var dragObject;
  var seq = 1;
  var componentSettings = {};
  var globalSetting = {
    paletteSelector: ".palette",
    layoutType: "free",// "free"或"grid"
    padding: 0 //默认为0
  }

  function isGridLayout() {
    if (globalSetting.layoutType == "grid") {
      return true;
    } else {
      false;
    }
  }

  function getPalette() {
    return $(globalSetting.paletteSelector);
  }

  /**
   * 设置拖动层的鼠标显示样式
   */
  function setDragLayerCursor(cursorStyle) {
    $(".drag-layer").css({"cursor": cursorStyle});
  }

  function initDragLayer() {
    // 添加一个层用于拖拽时浮于最上层，防止触发底层组件的事件
    $('<div class="drag-layer"></div>').appendTo("body");
  }

  /**
   * 显示拖动层
   */
  function showDragLayer() {
    $(".drag-layer").addClass("drag-layer-active");
  }

  /**
   * 隐藏拖动层
   */
  function hideDragLayer() {
    var dragLayer = $(".drag-layer");

    //自动恢复鼠标为默认样式
    dragLayer.css({"cursor": "default"});
    dragLayer.removeClass("drag-layer-active");
  }

  function initDragPanelBorderBox() {
    getPalette().append($('<div id="dp-bbox" class="drag-panel-border-box"></div>'));
  }

  /**
   * 显示拖动时用于表示相对位置的边框
   */
  function showDragPanelBorderBox(dragPanel) {
    var palette = getPalette();
    var x = dragPanel.position().left + palette.scrollLeft();
    var y = dragPanel.position().top + palette.scrollTop();
    var w = dragPanel.outerWidth();
    var h = dragPanel.outerHeight();

    $(".drag-panel-border-box").css({
      left: x,
      top: y,
      height: h,
      width: w
    });
    $(".drag-panel-border-box").show();
  }

  /**
   * 隐藏拖动时用于表示相对位置的边框
   */
  function hideDragPanelBorderBox() {
    $(".drag-panel-border-box").hide();
  }

  function getDragPanelTemplate(componentType) {
    var settings = componentSettings[componentType];
    var width = settings.width;
    var height = settings.height;

    var template =
      '<div class="drag-panel" style="width:' + width + 'px;height:' + height + 'px;">' +
      '  <div class="drag-panel-content-container"></div>' +
      '  <div class="arrow-drag-layer"></div>' +
      '  <div class="drag-panel-header-container">' +
      '    <div class="drag-panel-header">' +
      '      <span class="icon-button icon-button-edit"></span>' +
      '      <span class="icon-button icon-button-config"></span>' +
      '      <span class="icon-button icon-button-delete"></span>' +
      '      <span class="icon-button icon-button-more"></span>' +
      '      <div class="more-menubar">' +
      '        <div>详细设置</div>' +
      '        <div>置于顶层</div>' +
      '        <div>置于底层</div>' +
      '        <div>上移一层</div>' +
      '        <div>下移一层</div>' +
      '        <div>复制</div>' +
      '        <div>删除</div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="tl-arrow"></div>' +
      '  <div class="tr-arrow"></div>' +
      '  <div class="bl-arrow"></div>' +
      '  <div class="br-arrow"></div>' +
      '</div>';

    return template;
  }

  function handleActiveEvents(dragPanel) {
    /**
     * 当鼠标进入组件时则高亮该组件
     */
    dragPanel.on("mouseenter", function (event) {
      var panel = $(this);

      //该组件为激活状态时不进行任何处理
      if (!panel.attr("isActive")) {
        panel.addClass("drag-panel-active");
      }
    });

    /**
     * 当鼠标离开组件时则取消高亮该组件
     */
    dragPanel.on("mouseleave", function (event) {
      var panel = $(this);

      //该组件为激活状态时不进行任何处理
      if (!panel.attr("isActive")) {
        panel.removeClass("drag-panel-active");
      }
    });

    /**
     * 当鼠标点击组件时则将该组件进行高亮显示并将其状态设置为激活状态,
     * 如果已经是激活状态则取消当前的激活状态
     */
    dragPanel.on("click", function (event) {
      var panel = $(this);
      var isActive = panel.attr("isActive");

      if (isActive) {
        panel.trigger("inactive");
      } else {
        panel.trigger("active")
      }

      event.stopPropagation();
    });

    /**
     * 激活该组件，即高亮显示该组件，"active"事件为自定义事件
     */
    dragPanel.on("active", function () {
      var panel = $(this);

      $(".drag-panel").attr("currentPanel", "false");
      panel.attr("currentPanel", "true");

      // 如果该组件已经是激活状态则不进行任何处理
      if (!panel.attr("isActive")) {
        //取消所有其它组件的选中状态，即一次只允许激活一个组件
        $(".drag-panel[currentPanel='false']").removeAttr("isActive");
        $(".drag-panel[currentPanel='false']").removeClass("drag-panel-active");
        $(".drag-panel[currentPanel='false'] .more-menubar").hide();

        panel.attr("isActive", true);
        panel.addClass("drag-panel-active");
      }
    });

    /**
     * 取消该组件的激活状态，"inactive"事件为自定义事件
     */
    dragPanel.on("inactive", function () {
      var panel = $(this);
      panel.removeAttr("isActive");
      panel.removeClass("drag-panel-active");
      $(this).find(".more-menubar").hide();
    });
  }

  function handleHeaderButtonEvents(dragPanel) {
    /**
     * 取消点击拖拽组件Header操作按钮点击时会触发父组件的拖动事件
     */
    dragPanel.find(".icon-button,.more-menubar").on("mousedown", function (event) {
      // 取消点击拖拽组件Header操作按钮点击时会触发父组件的拖动事件
      event.stopPropagation();
    });

    /**
     * 取消点击Header操作按钮点击时会触发父组件的点击事件
     */
    dragPanel.find(".icon-button,.more-menubar").on("click", function (event) {
      event.stopPropagation();
    });

    /**
     * 当点击编辑按钮
     */
    dragPanel.find(".icon-button-edit").on("click", function (event) {
      alert("编辑")

      dragPanel.trigger("active")
    });

    dragPanel.find(".icon-button-config").on("click", function (event) {
      alert("组件定位配置");

      // 用于配置组件的定位以及布局相关的参数
      // 宽度
      // 高度
      // 左上角的X坐标
      // 左上角的Y坐标
      // 注意：以上四个参数只有在自由布局时才有效，栅格布局时进行灰化处理，只显示，不能手动编辑
      // 置顶
      // 置底
      // 上移一层
      // 下移一层

      dragPanel.trigger("active")
    });

    /**
     * 当点击删除按钮
     */
    dragPanel.find(".icon-button-delete").on("click", function (event) {
      alert("删除");

      dragPanel.trigger("active")
    });

    /**
     * 当点击更多操作的按钮
     */
    dragPanel.find(".icon-button-more").on("click", function (event) {
      // 通过像当前组件触发事件然后该事件上父级组件传递后最终被drap-panel组件给捕获,
      // 并由父组件来控制子组件more-menubar的显示和隐藏
      dragPanel.trigger("active")
      dragPanel.trigger("clickMoreButton");
    });

    /**
     * 当点击“更多”操作按钮时
     */
    dragPanel.on("clickMoreButton", function () {
      dragPanel.find(".more-menubar").slideToggle("fast");
    });
  }

  function resizeHandler(dragPanel, className, cursor, mouseOffsetHandler, positionHandler) {
    dragPanel.find("." + className).on("mousedown", function (mdEvent) {
      var dragTarget = $(mdEvent.currentTarget).parent();
      setDragLayerCursor(cursor);
      showDragLayer();
      showDragPanelBorderBox(dragTarget);

      dragTarget.trigger("active");
      dragTarget.addClass("opacity50");

      var mouseOffset = mouseOffsetHandler(mdEvent, dragTarget);
      var mouseOffsetX = mouseOffset.x;
      var mouseOffsetY = mouseOffset.y;
      var paletteOffset = getPalette().offset();

      $(document).on("mousemove", function (mmEvent) {
        positionHandler(mmEvent, dragTarget, mouseOffsetX, mouseOffsetY, paletteOffset);

        if (isGridLayout()) {
          dragTarget.moveTo();
        }
      });

      $(document).on("mouseup", function (muEvent) {
        $(document).off("mousemove");
        $(document).off("mouseup");
        setDragLayerCursor("default");
        hideDragLayer();
        hideDragPanelBorderBox();
        dragTarget.removeClass("opacity50");

        if (isGridLayout()) {
          dragTarget.repositionByGrid();
        } else {
          convertWithPercent(dragTarget);
        }
      });
    });
  }

  function handleChangeSizeEvents(dragPanel) {
    /**
     * 左上角resize箭头的移动处理逻辑
     */
    resizeHandler(dragPanel, "tl-arrow", "nw-resize",
      function (mdEvent, dragTarget) {
        return {
          x: mdEvent.pageX - dragTarget.offset().left,
          y: mdEvent.pageY - dragTarget.offset().top
        }
      },
      function (mmEvent, dragTarget, mouseOffsetX, mouseOffsetY, paletteOffset) {
        var x = mmEvent.pageX;
        var y = mmEvent.pageY;
        var left = dragTarget.offset().left;
        var top = dragTarget.offset().top;

        if (x - mouseOffsetX < paletteOffset.left) {
          x = paletteOffset.left + mouseOffsetX;
        }

        if (y - mouseOffsetY < paletteOffset.top) {
          y = paletteOffset.top + mouseOffsetY;
        }

        dragTarget.offset({top: y - mouseOffsetY, left: x - mouseOffsetX});
        dragTarget.width(dragTarget.width() + left - x + mouseOffsetX);
        dragTarget.height(dragTarget.height() + top - y + mouseOffsetY);
      });

    /**
     * 右上角resize箭头的移动处理逻辑
     */
    resizeHandler(dragPanel, "tr-arrow", "ne-resize",
      function (mdEvent, dragTarget) {
        return {
          x: dragTarget.offset().left + dragTarget.width() - mdEvent.pageX,
          y: mdEvent.pageY - dragTarget.offset().top
        }
      },
      function (mmEvent, dragTarget, mouseOffsetX, mouseOffsetY, paletteOffset) {
        var x = mmEvent.pageX;
        var y = mmEvent.pageY;
        var left = dragTarget.offset().left;
        var top = dragTarget.offset().top;

        if (y - mouseOffsetY < paletteOffset.top) {
          y = paletteOffset.top + mouseOffsetY;
        }

        dragTarget.offset({top: y - mouseOffsetY, left: left});
        dragTarget.width(x - left + mouseOffsetX);
        dragTarget.height(dragTarget.height() - (y - top) + mouseOffsetY);
      }
    );

    /**
     * 左下角resize箭头的移动处理逻辑
     */
    resizeHandler(dragPanel, "bl-arrow", "sw-resize",
      function (mdEvent, dragTarget) {
        return {
          x: mdEvent.pageX - dragTarget.offset().left,
          y: dragTarget.offset().top + dragTarget.height() - mdEvent.pageY
        }
      },
      function (mmEvent, dragTarget, mouseOffsetX, mouseOffsetY, paletteOffset) {
        var x = mmEvent.pageX;
        var y = mmEvent.pageY;
        var left = dragTarget.offset().left;
        var top = dragTarget.offset().top;

        if (x - mouseOffsetX < paletteOffset.left) {
          x = paletteOffset.left + mouseOffsetX;
        }

        dragTarget.offset({top: top, left: x - mouseOffsetX});
        dragTarget.width(dragTarget.width() - (x - left) + mouseOffsetX);
        dragTarget.height(y - top + mouseOffsetY);
      }
    );

    /**
     * 右下角resize箭头的移动处理逻辑
     */
    resizeHandler(dragPanel, "br-arrow", "se-resize",
      function (mdEvent, dragTarget) {
        return {
          x: dragTarget.offset().left + dragTarget.width() - mdEvent.pageX,
          y: dragTarget.offset().top + dragTarget.height() - mdEvent.pageY
        }
      },
      function (mmEvent, dragTarget, mouseOffsetX, mouseOffsetY, paletteOffset) {
        var x = mmEvent.pageX;
        var y = mmEvent.pageY;
        var left = dragTarget.offset().left;
        var top = dragTarget.offset().top;

        dragTarget.width(x - left + mouseOffsetX);
        dragTarget.height(y - top + mouseOffsetY);
      }
    );
  }

  function createDragPanel(componentType) {
    var dragPanel = $(getDragPanelTemplate(componentType));

    //只在网格布局时才有效
    if (isGridLayout()) {
      dragPanel.css("padding", globalSetting.padding);
    }

    //处理鼠标进入以及点击会高亮当前组件
    handleActiveEvents(dragPanel);

    //处理头部按钮的相关点击事件
    handleHeaderButtonEvents(dragPanel);

    //处理Panel的四个角改变大小的事件
    handleChangeSizeEvents(dragPanel);

    /**
     * 移动组件
     */
    dragPanel.find(".drag-panel-header").on("mousedown", function (mdEvent) {
      dragPanel.addClass("opacity50");
      var isActived = dragPanel.attr("isActive");

      if (!isActived) {
        dragPanel.attr("isActive", true);
      }

      setDragLayerCursor("move");
      showDragLayer();
      showDragPanelBorderBox(dragPanel);

      var palette = getPalette();
      var paletteOffset = palette.offset();
      var paletteScrollTop = palette.scrollTop();
      var paletteScrollLeft = palette.scrollLeft();

      //计算当前鼠标位置与被移动组件的左上角位置的相对偏移量
      var offsetWidth = mdEvent.pageX - dragPanel.offset().left;
      var offsetHeight = mdEvent.pageY - dragPanel.offset().top;

      $(document).on("mousemove", function (mmEvent) {
        var x = mmEvent.pageX - offsetWidth - paletteOffset.left + paletteScrollLeft - 1;
        var y = mmEvent.pageY - offsetHeight - paletteOffset.top + paletteScrollTop - 1;

        // 限制组件不允许移出“画板”范围
        if (x < 0) {
          x = 0;
        }

        if (y < 0) {
          y = 0;
        }

        dragPanel.css({left: x, top: y});

        if (isGridLayout()) {
          dragPanel.moveTo();
        }
      });

      $(document).on("mouseup", function (muEvent) {
        $(document).off("mousemove");
        $(document).off("mouseup");

        if (!isActived) {
          dragPanel.removeAttr("isActive");
        }

        setDragLayerCursor("default");
        hideDragLayer();
        hideDragPanelBorderBox();
        dragPanel.removeClass("opacity50");

        if (isGridLayout()) {
          dragPanel.repositionByGrid();
        } else {
          convertWithPercent(dragPanel);
        }
      });
    });

    return dragPanel;
  }

  /**
   * 冒泡排序算法
   *
   * @param arr
   * @returns {*}
   */
  function bubbleSort(arr) {
    var len = arr.length;
    for (var i = 0; i < len; i++) {
      for (var j = 0; j < len - 1 - i; j++) {
        if (arr[j] < arr[j + 1]) { //相邻元素两两对比
          var temp = arr[j + 1]; //元素交换
          arr[j + 1] = arr[j];
          arr[j] = temp;
        }
      }
    }
    return arr;
  }

  /**
   * 切换布局方式
   *
   * @param type
   */
  function switchLayout(type) {
    //如果要切换的布局类型与当前是一致的则不进行任何处理
    if (globalSetting.layoutType == type) {
      return;
    } else {
      if ("grid" == type) {
        globalSetting.layoutType = "grid";
        getPalette().initGridLayout();
        var ypanelList = new Object();
        var yArr = new Array();

        //遍历所有已布局的块并按该的左上角的坐标来分类保存到ypanelList中，之后会按需要的排序规则进行排序
        getPalette().find(".drag-panel").each(function (key, value) {
          var dragPanel = $(value);
          dragPanel.css("padding", globalSetting.padding);

          var x = dragPanel.position().left + getPalette().scrollLeft();
          var y = dragPanel.position().top + getPalette().scrollTop();

          if (ypanelList[y] == undefined) {
            yArr.push(y);
            ypanelList[y] = new Object();

            var xArr = new Array();
            var xPanelList = new Object();

            ypanelList[y] = {
              xArr: xArr,
              xPanelList: xPanelList
            }
          }

          //如果两个块的左上角坐标相同，则按each遍历的先后顺序保存
          var sameList = ypanelList[y].xPanelList[x];

          if (sameList == undefined) {
            ypanelList[y].xArr.push(x);
            sameList = [dragPanel];
            ypanelList[y].xPanelList[x] = sameList;
          } else {
            sameList.push(dragPanel)
          }
        });

        // 按块坐标的y值（即top值）进行排序，y值越大的优先添加到网格布局中，即从下往向的顺序添加
        $.each(bubbleSort(yArr), function (idx, val) {
          var yList = ypanelList[val];

          // y值相同则按x值（即left值）进行排序，x值越大的优先添加网格布局中，即从右往左的顺序添加
          $.each(bubbleSort(yList.xArr), function (idx, val) {
            // 如果块的左上角坐标重叠则按Dom的先后顺序添加，先添加到画板的块先添加到网格布局中
            $.each(yList.xPanelList[val], function (idx, val) {
              val.css("top", 0);
              val.appendToGridLayout();
            });
          });
        });
      } else if ("free" == type) {
        globalSetting.layoutType = "free";
        getPalette().find(".drag-panel").css("padding", 0);
      } else {
        throw "未知的布局类型：" + type;
      }
    }
  }

  /**
   * 将元素的坐标、高度以及宽度换算为百分比
   *
   * @param ele
   */
  function convertWithPercent(dragPanel) {
    var palette = getPalette();
    var x = dragPanel.position().left + palette.scrollLeft();
    var y = dragPanel.position().top + palette.scrollTop();
    var w = dragPanel.outerWidth();
    var h = dragPanel.outerHeight();

    dragPanel.css({
      left: x / palette.width() * 100 + "%",
      top: y / palette.height() * 100 + "%",
      width: w / palette.width() * 100 + "%",
      height: h / palette.height() * 100 + "%"
    })
  }

  /**
   * 插件初始化
   */
  function init(options) {
    globalSetting = $.extend(globalSetting, options);

    /**
     * 给可拖动布局的元素绑定可拖动的能力，可拖动布局的元素必须有dragable的class
     */
    $(".dragable").on("mousedown", function (mdEvent) {
      //显示拖动层，该层是用于防止触发非拖动层的相关事件，该层显示在最顶层，所以z-index值必须全局最高
      showDragLayer();

      //获取准备拖动的组件对象
      var dragTarget = $(mdEvent.currentTarget);
      var componentType = dragTarget.attr("componentType");
      var settings = componentSettings[componentType];
      var tempComponent = $('<div id="tempComponent" class="temp-component"></div>');
      getPalette().append(tempComponent);

      tempComponent.css({
        width: settings.width,
        height: settings.height
      });
      var addedToGrid = false;

      //复制所选的组件进行拖拽移动
      dragObject = dragTarget.clone(false);
      dragObject.css({
        position: "absolute",
        left: dragTarget.offset().left,
        top: dragTarget.offset().top
      });

      //设置为半透明
      dragObject.addClass("opacity50");

      //dragable是用于标识该组件是可拖动的，所以复制出来的组件需要删除该标识
      dragObject.removeClass("dragable");
      dragObject.appendTo("body");

      //计算当前鼠标位置与所拖拽的组件的左上角坐标的相对偏移值
      var dragObjectOffset = dragObject.offset();
      var offsetWidth = mdEvent.pageX - dragObjectOffset.left;
      var offsetHeight = mdEvent.pageY - dragObjectOffset.top;

      //当鼠标移动时
      $(document).on("mousemove", function (mmEvent) {
        var x = mmEvent.pageX - offsetWidth;
        var y = mmEvent.pageY - offsetHeight;

        dragObject.css({left: x, top: y});

        //获取移动后的组件的坐标并计算是否在“画板”的区域内
        var left = dragObject.offset().left;
        var top = dragObject.offset().top;
        var palette = getPalette();
        var paletteOffset = palette.offset();
        var paletteScrollLeft = palette.scrollLeft();
        var paletteScrollTop = palette.scrollTop();

        tempComponent.css({
          left: (left - paletteOffset.left + paletteScrollLeft),
          top: (top - paletteOffset.top + paletteScrollTop),
        });

        //如果在区域内则将鼠标的样式修改为”绿色箭头“以表明该位置可放置组件
        if (left > paletteOffset.left && top > paletteOffset.top) {
          setDragLayerCursor("url(img/pointer04.cur),auto");

          if (isGridLayout() && !addedToGrid) {
            addedToGrid = true;
            showDragPanelBorderBox(tempComponent);
            tempComponent.appendToGridLayout("dp-bbox");
          }
        } else {
          setDragLayerCursor("default");

          if (isGridLayout() && addedToGrid) {
            addedToGrid = false;
            hideDragPanelBorderBox();
            tempComponent.removeFromGridLayout();
          }
        }

        if (isGridLayout() && addedToGrid) {
          tempComponent.moveTo();
        }
      });

      //当结束移动时
      $(document).on("mouseup", function (muEvent) {
        //取消相关事件绑定
        $(document).off("mousemove");
        $(document).off("mouseup");
        //将拖拽层的鼠标样式还原并隐藏拖拽层
        setDragLayerCursor("default");
        hideDragLayer();

        //获取移动后的组件的坐标并计算是否在“画板”的区域内
        var left = dragObject.offset().left;
        var top = dragObject.offset().top;
        var palette = getPalette();
        var paletteOffset = palette.offset();
        var paletteScrollLeft = palette.scrollLeft();
        var paletteScrollTop = palette.scrollTop();

        // 只允许将元素放置在plaette容器的范围内
        if (left > paletteOffset.left && top > paletteOffset.top) {
          var id = "drag-panel" + seq++;
          var newDivObject = createDragPanel(componentType);
          newDivObject.attr("id", id);

          newDivObject.css({
            left: (left - paletteOffset.left + paletteScrollLeft),
            top: (top - paletteOffset.top + paletteScrollTop),
            width: dragObject.width(),
            height: dragObject.height()
          });

          getPalette().append(newDivObject);

          if (isGridLayout()) {
            tempComponent.changeGridLayoutId(id);
            newDivObject.repositionByGrid();
          } else {
            newDivObject.animate({
              width: tempComponent.width(),
              height: tempComponent.height()
            }, 200, function () {
              convertWithPercent(newDivObject);
            });
          }
        }

        dragObject.remove();
        tempComponent.remove();
        hideDragPanelBorderBox();
      });
    });

    getPalette().on("click", function () {
      //点击“画布”的空白地方时取消已选组件的选中状态
      $(".drag-panel").trigger("inactive");
    });

    getPalette().on("reSize", function (event, w, h) {
      $(this).resized();
    });

    $(".icon-button-save").on("click", function () {
      alert("点击保存按钮");
    });

    $(window).on("resize", function (event) {
      var palette = getPalette();
      palette.trigger("reSize", [palette.width(), palette.height()]);
    });

    /**
     *
     */
    $(function () {
      initDragLayer();
      initDragPanelBorderBox();
    });

    getPalette().initGridLayout();
  }

  $.extend({
    initDragPlugin: function (options) {
      init(options);
    },
    registerComponent: function (type, options) {
      componentSettings[type] = options;
    },
    switchLayout: switchLayout
  });
})(jQuery, window, document);
