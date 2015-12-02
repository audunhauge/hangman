var H5P = H5P || {};

H5P.Hangman = (function($) {

  var gameState = {};   // Keep track of score,words seen etc
  var STARTING = 'STARTING';
  var FAILED   = 'FAILED';

  /**
   * Constructor function.
   */
  function C(options, id) {
    // Extend defaults with provided options
    this.options = $.extend(true, {}, {
      greeting: 'Hangman'
    }, options);
    // Keep provided id.
    this.id = id;
  }

  /**
   * Prepare for start of word guessing game
   *
   * @private
   */
  function setup() {
    var ctx = document.getElementById('h5p-hangman-graf').getContext('2d');
    gameState.draw = prepDraw(ctx);           // Initialize drawing state
    gameState.divAlphabeth = document.querySelector('#h5p-hangman-alphabeth');
    gameState.divBok = document.querySelector('#h5p-hangman-bokstaver');
    gameState.seenWords = [ ];
    gameState.win = 0;
    gameState.loss = 0;
    gameState.divAlphabeth.addEventListener('click',useChar);
    newWord();
  }

  /**
   * Create array of drawing commands, return driving function
   *
   * @private
   * @param {Context2d} ctx  2d context for canvas
   * @returns {func} function clusure for drawing hangman
   */
  function prepDraw(ctx) {
    var hang = [];
    ctx.lineWidth = 4;
    hang.push(function() { ctx.lineTo(120.5,50);});
    hang.push(function() { ctx.lineTo(120.5,20);});
    hang.push(function() { ctx.lineTo(150.5,20);});
    hang.push(function() { ctx.lineTo(150.5,50);});
    hang.push(function() {ctx.arc(150, 60, 10, 0, 2 * Math.PI,true);});
    hang.push(function() { ctx.lineTo(150.5,70);});
    hang.push(function() { ctx.lineTo(150.5,90);});
    hang.push(function() { ctx.lineTo(160.5,100);ctx.moveTo(150.5,90);});
    hang.push(function() { ctx.lineTo(140.5,100);});
    hang.push(function() { ctx.moveTo(150.5,70);ctx.lineTo(130.5,80);});
    hang.push(function() { ctx.moveTo(150.5,70);ctx.lineTo(170.5,80);});
    hang.push(function() { ctx.moveTo(150.5,70);ctx.lineTo(170.5,80);});
    /**
     * Drawing function with hang as closure
     *
     * @param {number} n int length of hangman to draw
     */
    return function(n) {
      var i;
      n = Math.min(n,hang.length - 1);
      ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
      ctx.fillStyle = 'rgba(30,153,255,0.8)';
      ctx.fillRect(18.5, 120, 190.5, 4);
      ctx.beginPath();
      ctx.moveTo(120, 120);
      for (i = 0; i < n; i++) {
        hang[i]();
      }
      ctx.stroke();
    }
  }

  /**
   * Pick a random new word from list, preferably unseen
   * Starts the game with new word
   */
  function newWord() {
    var i = 0;
    var word;
    var words = gameState.words;
    while (i < 20 && !word) {
      word = words[ Math.floor(Math.random() * words.length )];
      word = word.replace(/ +/g,' ');  // Trim duplix space
      if (gameState.seenWords.indexOf(word) >= 0) {
        word = null;
      }
      i++;
    }
    if (i < 20) {
      gameState.seenWords.push(word);
    }
    initGame(word.toLowerCase());
    playGame();
  }

  /**
   * Set up start-state for game
   *
   * @param{string} word - word to guess
   */
  function initGame(word) {
    gameState.failed = 0;
    gameState.free = 'abcdefghijklmnopqrstuvwxyzæøå'.split('');
    gameState.word = word;
    gameState.uniq = word.split('').sort()
        .filter(function(e, i, ch) { return (i == 0 || e != ch[i - 1]); });
    // Uniq is a list of uniq chars in word
    gameState.guessed = [];   // Array of correct guesses
    gameState.state = STARTING;
    visLedig();
  }

  /**
   * Renders current game state
   * activated by useChar()
   */
  function playGame() {
    gameState.draw(gameState.failed);
    visBokstaver(gameState.word);
    if (gameState.correct === true) {
      gameWin();
    } else if (gameState.failed > 11) {
      gameLost();
    }
  }

  /**
   * The attempt is over, show results and button to start new game
   */
  function newGame() {
    var s =  '<button id="h5p-hangman-neword" type="button">Nytt ord</button>';
    s += 'Antall ord ' + (gameState.loss + gameState.win);
    s += 'Win:' + gameState.win;
    s += 'Loss:' + gameState.loss;
    gameState.divAlphabeth.innerHTML = s;
    document.querySelector('#h5p-hangman-neword').addEventListener('click',newWord);
  }

  /**
   * User guessed correct word, show victory animation
   */
  function gameWin() {
    var i;
    var ch;
    var letters = document.querySelectorAll('#h5p-hangman-alphabeth > span');
    for (i = 0; i < letters.length; i++) {
      ch = letters[i];
      if (ch.innerHTML != '') {
        ch.classList.add('h5p-hangman-droppy');
      }
    };
    ch.addEventListener('animationend',newGame);
    gameState.win ++;
  }

  /**
   * User failed to guess correct word, show failed animation
   */
  function gameLost() {
    var n;
    var animate = true;
    var i;
    var ch
    var c;
    var waiting = [];
    var letters = document.querySelectorAll('#h5p-hangman-alphabeth > span');
    for (i = 0; i < letters.length; i++) {
      ch = letters[i];
      c = ch.innerHTML;
      if (c != '' && gameState.uniq.indexOf(c) < 0) {
        waiting.push(ch);
      }
    };
    animate = typeof ch.addEventListener === 'function';
    n = animate ? Math.round(Math.log2(waiting.length + 1)) : waiting.length - 1;
    // If animate then drop by groups
    function nextOne() {
      var ch;
      var m = n;  // How many at once
      while (waiting.length && m > 0) {
        ch = waiting.pop();
        ch.classList.add('h5p-hangman-blowy');
        m--;
      }
      if (animate) {
        if (waiting.length) {
          ch.addEventListener('animationend',nextOne);
        } else {
          ch.addEventListener('animationend',newGame);
        }
      } else {
        newGame();
      }
    }
    nextOne();
    gameState.guessed = gameState.uniq.slice(0);
    // So user can see correct word
    gameState.state = FAILED;
    gameState.loss++;
    visBokstaver(gameState.word);
  }

  /**
   * Show unused chars
   */
  function visLedig() {
    var s = '';
    var dx;
    var dy;
    var i = 0;
    gameState.free.forEach(function(ch) {
      dy = Math.floor(i / 7) * 24;
      dx = (i % 7) * 24;
      s += '<span style="top:' + dy + 'px; left:' + dx 
           + 'px;" class="h5p-hangman-freebok">' + ch + '</span>';
      i++;
    })
    gameState.divAlphabeth.innerHTML = s;
  }

  /**
   * Event listener for div containing chars
   * @param {event} e
   */
  function useChar(e) {
    if (gameState.state == FAILED) { return };
    var ch;
    if (e.target && e.target.nodeName === 'SPAN') {
      ch = e.target.innerHTML;
      e.target.innerHTML = '';
      if (gameState.uniq.indexOf(ch) >= 0) {
        gameState.guessed.push(ch);
      } else if (ch != '') {
        gameState.failed ++;
      }
      playGame();
    }
  }

  /**
   * Shows line for each char of word to guess
   * blank lines if no guess for this slot
   *
   * @param {string}  word
   */
  function visBokstaver(word) {
    var bs = word.split('');
    gameState.correct = true;
    gameState.divBok.innerHTML = '';
    bs.forEach(function(ch) {
      var divBs = document.createElement('div');
      if (ch === ' ') {
        divBs.classList.add('h5p-hangman-space');
      } else {
        if (gameState.guessed.indexOf(ch) >= 0) {
          divBs.innerHTML = ch;
        } else {
          gameState.correct = false;
        }
        divBs.classList.add('h5p-hangman-bokstav');
      }
      gameState.divBok.appendChild(divBs)
    });
  }


  /**
   * Attach function called by H5P framework to insert H5P content into
   * page
   *
   * @param {jQuery} $container
   */
  C.prototype.attach = function ($container) {
    // Set class on container to identify it as a greeting card
    // container.  Allows for styling later.
    $container.addClass('h5p-hangman');
    // Add image if provided.
    // Add greeting text.
    var game = '<div id="h5p-hangman-main">'
        + '<canvas id="h5p-hangman-graf"></canvas>'
        + '<div id="h5p-hangman-alphabeth">' + this.options.wordlist + '</div>'
        + '</div>'
        + '<div id="h5p-hangman-bokstaver"></div>';
    $container.append('<div class="hangman-text">'
             + this.options.greeting + '</div>' + game);
    gameState.words = this.options.wordlist.split(',');
    setup();
  };

  return C;
})(H5P.jQuery);
