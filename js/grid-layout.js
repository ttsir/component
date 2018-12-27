'use strict';

;(function ($, window, document, undefined) {
  var settings = {
    columnsPerPage: 24, // 默认分为24列
    rowsPerPage: 24,    // 默认分为24行
    pageWidth: 5,       // 默认当前网络布局单行最多允许有 24*5 列
    pageHeight: 10      // 默认当前网络布局最多允许有 24*10 行
  };

  var map;
  var blocks = new Array();
  var blockNum = 1;
  var totalWidth;
  var totalHeight;
  var cellWidth;
  var cellHeight;

  /**
   * 上移一格
   *
   * @param blockConfig
   */
  function moveUp(blockConfig) {
    //将冲突的块从二维数组中取出来
    getOut(blockConfig);

    //进行向上偏移
    blockConfig.y -= 1;

    //重新放回到二维数组中
    putIn(blockConfig);
  }

  /**
   * 递归式将块上移:
   *    移动当前块时先获取当前块下方且与当前块相连的所有块，将当前块上移一排之后尝试将下方所有相连的块上移一排
   *
   * @param blockConfig
   */
  function recursiveMoveUp(blockConfig) {
    // 如果该块已经在在第一排则不处理，否则进行上移操作
    if (blockConfig.y > 0) {
      var aboveRowNum = blockConfig.y - 1;
      var cloumnFrom = blockConfig.x;
      var cloumnTo = blockConfig.x + blockConfig.w - 1;

      // 检查该块上一排是否没有块存在
      for (var c = cloumnFrom; c <= cloumnTo; c++) {
        var aboveBlockConfig = map[aboveRowNum][c];
        var aboveBlockId = aboveBlockConfig.id;

        // 存在ID,说明该块的上面有块的存在，不做任何上移操作，直接返回
        if (undefined != aboveBlockId) {
          return;
        }
      }

      // 如果该块的上面没有块的存在，说明可以进行上移操作，
      // 则先检查该块的下面是否有块的存在，如果有则一并进行上移操作
      var belowRowNum = blockConfig.y + blockConfig.h;
      var belowBlockList = new Array();

      for (var c = cloumnFrom; c <= cloumnTo; c++) {
        var belowBlockConfig = map[belowRowNum][c];
        var belowBlockId = belowBlockConfig.id;

        // 存在ID,说明该块的下面有块的存在
        if (undefined != belowBlockId) {
          belowBlockList[belowBlockId] = belowBlockConfig;
        }
      }

      //先将当前块上移一排，然后再将当前块下面的块进行上移操作
      moveUp(blockConfig);

      for (var belowBlockId in belowBlockList) {
        var belowBlockConfig = belowBlockList[belowBlockId];

        recursiveMoveUp(belowBlockConfig);
      }

      //再次尝试上移一排，直到上方有块挡住当前块或已经移动到第一排
      recursiveMoveUp(blockConfig);
    }
  }

  /**
   * 下移指定的格数
   *
   * @param blockConfig
   * @param count 格数
   */
  function moveDown(blockConfig, count) {
    //将冲突的块从二维数据中取出来
    getOut(blockConfig);

    //进行向上偏移
    blockConfig.y += count;

    //重新放回到二维数组中
    putIn(blockConfig);
  }

  /**
   * 递归式将块下移
   *
   * @param blockConfig
   * @param count
   */
  function recursiveMoveDown(blockConfig, count) {
    // 检查该块的下面是否有与其直接相连的块的存在，如果有则先将下方的块进行下移操作
    var belowRowNum = blockConfig.y + blockConfig.h;
    var cloumnFrom = blockConfig.x;
    var cloumnTo = blockConfig.x + blockConfig.w - 1;

    for (var c = cloumnFrom; c <= cloumnTo; c++) {
      var belowBlockConfig = map[belowRowNum][c];
      var belowBlockId = belowBlockConfig.id;

      // 存在ID,说明该块的下面有块的存在
      if (undefined != belowBlockId) {
        recursiveMoveDown(belowBlockConfig, count);
      }
    }

    moveDown(blockConfig, count);
  }

  /**
   * 检查是否存在冲突
   *
   * @param blockConfig
   * @returns {any[]}
   */
  function checkConflict(blockConfig) {
    var conflictList = new Array();

    var x = blockConfig.x;
    var y = blockConfig.y;
    var w = blockConfig.w;
    var h = blockConfig.h;

    for (var ws = 0; ws < w; ws++) {
      for (var hs = 0; hs < h; hs++) {
        var r = y + hs;
        var c = x + ws;

        var conflictBlockConfig = map[r][c];
        var blockId = conflictBlockConfig.id;

        if (null != blockId || undefined != blockId) {
          conflictList[blockId] = conflictBlockConfig;
        }
      }
    }

    return conflictList;
  }

  /**
   * 找到第一个冲突的块即返回，所谓冲突的块即所在放置块的位置已经存在其它的块了,
   * 所以需要先将冲突的块下移，腾出放置空间，然后将当前块放入其中
   *
   * @param blockConfig
   * @returns {*}
   */
  function checkFirstConflict(blockConfig) {
    var x = blockConfig.x;
    var y = blockConfig.y;
    var w = blockConfig.w;
    var h = blockConfig.h;

    for (var ws = 0; ws < w; ws++) {
      for (var hs = 0; hs < h; hs++) {
        var r = y + hs;
        var c = x + ws;

        var conflictBlockConfig = map[r][c];
        var blockId = conflictBlockConfig.id;

        if (null != blockId || undefined != blockId) {
          return conflictBlockConfig;
        }
      }
    }

    return null;
  }

  /**
   * 将块的信息添加到二维数组中保存起来
   *
   * @param blockConfig
   */
  function putIn(blockConfig) {
    //检查是否有冲突的块，即分析当前将要放入的块所要占据的格子中是否已存在其它的块
    var conflictBlockConfig = checkFirstConflict(blockConfig);

    if (null != conflictBlockConfig) {
      //计算下移的距离
      var moveDownCount = blockConfig.h - (conflictBlockConfig.y - blockConfig.y);

      //进行递归下移
      recursiveMoveDown(conflictBlockConfig, moveDownCount);

      //重新尝试将块放入二维数组中，即会再试检查是否还有其它的块占据了当前块需要放置的位置中
      putIn(blockConfig);
    } else {
      // 处理完冲突的块后再将待插入的块放入到二维数组中
      var x = blockConfig.x;
      var y = blockConfig.y;
      var w = blockConfig.w;
      var h = blockConfig.h;

      for (var ws = 0; ws < w; ws++) {
        for (var hs = 0; hs < h; hs++) {
          var r = y + hs;
          var c = x + ws;

          map[r][c] = blockConfig;
        }
      }
    }
  }

  /**
   * 将块的信息从二维数组中移除
   *
   * @param blockConfig
   */
  function getOut(blockConfig) {
    var x = blockConfig.x;
    var y = blockConfig.y;
    var w = blockConfig.w;
    var h = blockConfig.h;

    for (var ws = 0; ws < w; ws++) {
      for (var hs = 0; hs < h; hs++) {
        var r = y + hs;
        var c = x + ws;

        map[r][c] = {};
      }
    }
  }

  /**
   * 添加一个新的块到二维数组中
   *
   * @param id
   * @param x
   * @param y
   * @param w
   * @param h
   */
  function add(id, x, y, w, h) {
    //构造相应块的配置信息
    var blockConfig = {id: id, x: x, y: y, w: w, h: h};

    //将组件记录下来
    blocks[id] = blockConfig;

    //放入二维数组中
    putIn(blockConfig);

    recursiveMoveUp(blockConfig);
  }

  function updateId(originalId, updatedId) {
    var blockConfig = blocks[originalId];
    blockConfig.id = updatedId;

    delete blocks[originalId];
    blocks[updatedId] = blockConfig
  }

  /**
   * 从二维数据中删除指定的块
   *
   * @param id
   */
  function del(id) {
    var blockConfig = blocks[id];
    delete blocks[id];

    getOut(blockConfig);

    //将该块下方的块进行上移操作
    var belowRowNum = blockConfig.y + blockConfig.h;
    var cloumnFrom = blockConfig.x;
    var cloumnTo = blockConfig.x + blockConfig.w - 1;
    var belowBlockList = {};

    for (var c = cloumnFrom; c <= cloumnTo; c++) {
      var belowBlockConfig = map[belowRowNum][c];
      var belowBlockId = belowBlockConfig.id;

      // 存在ID,说明该块的下面有块的存在
      if (undefined != belowBlockId) {
        belowBlockList[belowBlockId] = belowBlockConfig;
      }
    }

    for (var belowBlockId in belowBlockList) {
      var belowBlockConfig = belowBlockList[belowBlockId];

      recursiveMoveUp(belowBlockConfig);
    }
  }

  /**
   * 用于判断块的位置或大小是否发生了变化
   *
   * @param blockConfig
   * @param x
   * @param y
   * @param w
   * @param h
   * @returns {boolean}
   */
  function isChange(blockConfig, x, y, w, h) {
    if (blockConfig.x != x) {
      return true;
    }

    if (blockConfig.y != y) {
      return true;
    }

    if (blockConfig.w != w) {
      return true;
    }

    if (blockConfig.h != h) {
      return true;
    }

    return false;
  }

  /**
   * 移动到新的位置，注意此方法在改变块的大小时也会调用，该方法是一个通用方法
   *
   * @param blockId
   * @param x
   * @param y
   * @param w
   * @param h
   * @returns {boolean}
   */
  function moveTo(blockId, x, y, w, h) {
    var blockConfig = blocks[blockId];

    // 位置和大小没有发生变化，不做任何处理直接返回
    if (!isChange(blockConfig, x, y, w, h)) {
      return false;
    }

    getOut(blockConfig);

    //将该块下方的块进行上移操作
    var belowRowNum = blockConfig.y + blockConfig.h;
    var cloumnFrom = blockConfig.x;
    var cloumnTo = blockConfig.x + blockConfig.w - 1;
    var belowBlockList = {};

    for (var c = cloumnFrom; c <= cloumnTo; c++) {
      var belowBlockConfig = map[belowRowNum][c];
      var belowBlockId = belowBlockConfig.id;

      // 存在ID,说明该块的下面有块的存在
      if (undefined != belowBlockId) {
        belowBlockList[belowBlockId] = belowBlockConfig;
      }
    }

    for (var belowBlockId in belowBlockList) {
      var belowBlockConfig = belowBlockList[belowBlockId];

      recursiveMoveUp(belowBlockConfig);
    }

    blockConfig.x = x;
    blockConfig.y = y;

    if (null != w) {
      blockConfig.w = w;
    }

    if (null != h) {
      blockConfig.h = h;
    }

    putIn(blockConfig);
    recursiveMoveUp(blockConfig);

    return true;
  }

  /**
   * 刷新，即根据二维数组中保存的各块的定位信息对各块进行重新定位操作，
   * 因为当某个块移动或改变大小时会涉及多个块的重新定位
   *
   * @param dragPanel
   * @param borderBox
   */
  function refresh(dragPanel, borderBox) {
    var dragPanelId;
    var borderBoxId;

    if (dragPanel != undefined || borderBox != undefined) {
      dragPanelId = dragPanel.attr("id");
      borderBoxId = borderBox.attr("id");
    }

    for (var id in blocks) {
      var position = getFreeLayoutPosition(id);
      var left = position.x;
      var top = position.y;
      var width = position.w;
      var height = position.h;

      if (id == dragPanelId) {
        borderBox.css({left: left, top: top, width: width, height: height});
      } else {
        $("#" + id).css({left: left, top: top, width: width, height: height});
      }
    }
  }

  /**
   * 通过自由布局的坐标信息换算出网格布局的坐标信息
   *
   * @param element
   * @returns {{x: *, y: *, w, h}}
   */
  function getGridLayoutPosition(element) {
    var parentEle = element.parent();
    var x = element.position().left + parentEle.scrollLeft();
    var y = element.position().top + parentEle.scrollTop();
    var h = element.outerHeight();
    var w = element.outerWidth();

    //计算网格布局的坐标，宽度以及高度
    return {
      x: Math.round(x / cellWidth),
      y: Math.round(y / cellHeight),
      w: Math.round(w / cellWidth),
      h: Math.round(h / cellHeight)
    };
  }

  /**
   * 通过网格布局的坐标信息换算出自由布局的坐标信息
   *
   * @param id
   * @returns {{x: string, y: string, w: string, h: string}}
   */
  function getFreeLayoutPosition(id) {
    var blockConfig = blocks[id];

    return {
      x: blockConfig.x * (100 / settings.columnsPerPage) + "%",
      y: blockConfig.y * (100 / settings.rowsPerPage) + "%",
      w: blockConfig.w * (100 / settings.columnsPerPage) + "%",
      h: blockConfig.h * (100 / settings.rowsPerPage) + "%"
    };
  }

  function initCellSize(palette) {
    totalWidth = palette.outerWidth();
    totalHeight = palette.outerHeight();
    cellWidth = totalWidth / settings.columnsPerPage;
    cellHeight = totalHeight / settings.rowsPerPage;
  }

  $.fn.resetGridLayout = function () {
    var columns = settings.columnsPerPage * settings.pageWidth;
    var rows = settings.rowsPerPage * settings.pageHeight;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < columns; c++) {
        map[r][c] = {};
      }
    }

    blocks = new Array();
    blockNum = 1;
    initCellSize(this);
  };

  $.fn.initGridLayout = function (options) {
    settings = $.extend(settings, options);
    var columns = settings.columnsPerPage * settings.pageWidth;
    var rows = settings.rowsPerPage * settings.pageHeight;
    map = new Array(rows);
    blocks = new Array();
    blockNum = 1;

    for (var i = 0; i < rows; i++) {
      var column = new Array(columns);

      for (var ci = 0; ci < columns; ci++) {
        column[ci] = {};
      }

      map[i] = column;
    }

    initCellSize(this);
  };

  $.fn.resized = function () {
    initCellSize(this);
  };

  $.fn.appendToGridLayout = function (borderBoxId) {
    var id = this.attr('id');

    if (null == id || "" == id || undefined == id) {
      id = "block" + blockNum++;
      this.attr("id", id);
    }

    var position = getGridLayoutPosition(this);
    var x = position.x;
    var y = position.y;
    var w = position.w;
    var h = position.h;

    add(id, x, y, w, h);

    if (undefined != borderBoxId && "" != borderBoxId) {
      refresh(this, $("#" + borderBoxId));
    } else {
      refresh();
    }

    return id;
  };

  $.fn.removeFromGridLayout = function () {
    var id = this.attr('id');
    del(id);
  };

  $.fn.changeGridLayoutId = function (newId) {
    var id = this.attr('id');
    updateId(id, newId);
  };

  $.fn.moveTo = function () {
    var position = getGridLayoutPosition(this);
    var id = this.attr('id');
    var moved = moveTo(id, position.x, position.y, position.w, position.h);

    // 只有在块确实发生变化（改变位置或大小）时才进行刷新操作
    if (moved) {
      refresh(this, $("#dp-bbox"));
    }
  };

  $.fn.repositionByGrid = function () {
    var id = this.attr('id');
    var position = getFreeLayoutPosition(id);

    $("#" + id).animate({
      left: position.x,
      top: position.y,
      width: position.w,
      height: position.h
    }, 200);
  };
})(jQuery, window, document);
