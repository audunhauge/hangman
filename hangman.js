var H5P = H5P || {};

H5P.Hangman = (function($) {

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
  function setup(options, myId) {
    // qs prefix stands for querySelector
    
    var gameState = {};        // Keep track of score,words seen etc
    var _ui = options.UI;              // Grab hold of UI for text
    var STARTING = 'STARTING';
    var FAILED = 'FAILED';
    
    gameState.words = options.wordlist.split(',');
    gameState.attempts = options.attempts || 6;
    gameState.alphabeth = options.alphabeth
                          || 'abcdefghijklmnopqrstuvwxyz';
    gameState.qsGraf = '#h5p-hangman-graf-' + myId;
    var ctx = document.querySelector(gameState.qsGraf).getContext('2d');
    gameState.draw = prepDraw(ctx);           // Initialize drawing state
    gameState.qsAlphabeth = '#h5p-hangman-alphabeth-' + myId;
    gameState.divAlphabeth = document.querySelector(gameState.qsAlphabeth);
    gameState.qsChar = '#h5p-hangman-letters-' + myId
    gameState.divChar = document.querySelector(gameState.qsChar);
    gameState.seenWords = [];
    gameState.win = 0;
    gameState.loss = 0;
    gameState.id = myId;
    gameState.divAlphabeth.onclick = useChar;
    newWord();

    /**
     * Create array of drawing commands, return driving function
     *
     * @private
     * @param {Context2d} ctx  2d context for canvas
     * @returns {func} function closure for drawing hangman
     */
    function prepDraw(ctx) {
      var hang = [];
      ctx.lineWidth = 4;
      // Very rough drawing as a start
      hang.push(function () { ctx.lineTo(120.5, 50); });
      hang.push(function () { ctx.lineTo(120.5, 20); });
      hang.push(function () { ctx.lineTo(150.5, 20); });
      hang.push(function () { ctx.lineTo(150.5, 50); });
      hang.push(function () { ctx.arc(150, 60, 10, 0, 2 * Math.PI, true); });
      hang.push(function () { ctx.lineTo(150.5, 70); });
      hang.push(function () { ctx.lineTo(150.5, 90); });
      hang.push(function () { ctx.lineTo(160.5, 100); ctx.moveTo(150.5, 90); });
      hang.push(function () { ctx.lineTo(140.5, 100); });
      hang.push(function () { ctx.moveTo(150.5, 70); ctx.lineTo(130.5, 80); });
      hang.push(function () { ctx.moveTo(150.5, 70); ctx.lineTo(170.5, 80); });
      hang.push(function () { ctx.moveTo(150.5, 70); ctx.lineTo(170.5, 80); });
      /**
       * Drawing function with hang as closure
       *
       * @param {number} n  int count of failed chars
       * @param {number} m  int maximum allowed failures
       */
      return function (n, m) {
        var i;
        n = Math.min(hang.length - 1, Math.floor(hang.length / m) * n);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        // Start on clean canvas

        ctx.fillStyle = 'rgba(30,153,255,0.8)';
        ctx.fillRect(18.5, 120, 190.5, 4);
        // Draw a base for the hangman to stand on

        ctx.beginPath();
        ctx.moveTo(120, 120);
        for (i = 0; i < n; i++) {
          hang[i]();  // Draw as many segments as specified by n
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
      var search = true;
      var words = gameState.words;
      while (i < 20 && search) {
        word = words[Math.floor(Math.random() * words.length)];
        word = word.replace(/ +/g, ' ');  // Trim duplix space
        search = gameState.seenWords.indexOf(word) >= 0;
        i++;
      }
      if (i < 20) {
        // This is a new word, remember it
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
      gameState.failed = 0;   // Number of failed chars
      gameState.free = gameState.alphabeth.split('');
      // Unused chars
      gameState.word = word;
      gameState.uniq = word.split('').sort()
        .filter(function (e, i, ch) { return (i == 0 || e != ch[i - 1]); });
      // Uniq is a list of uniq chars in word
      gameState.guessed = [];   // Array of correct guesses
      gameState.state = STARTING;
      showFree();
    }

    /**
     * Renders current game state
     * activated by useChar()
     */
    function playGame() {
      gameState.draw(gameState.failed, gameState.attempts);
      showLetters(gameState.word);
      if (gameState.correct === true) {
        gameWin();
      } else if (gameState.failed >= gameState.attempts) {
        gameLost();
      }
    }

    /**
     * The attempt is over, show results and button to start new game
     */
    function newGame() {
      var s = '<div class="h5p-hangman-feedback">'
        + '<button class="h5p-hangman-neword" type="button">'
        + _ui.tryAgainButton + '</button>';
      s += '<div>' + _ui.wordCount + ' : '
      + (gameState.loss + gameState.win) + '</div>';
      s += '<div>' + _ui.correctCount + ' : ' + gameState.win + '</div>';
      s += '<div>' + _ui.errorCount + ' : ' + gameState.loss + '</div>';
      s += '</div>';
      gameState.divAlphabeth.innerHTML = s;
      document.querySelector(gameState.qsAlphabeth + ' .h5p-hangman-neword')
        .addEventListener('click', newWord);
    }

    /**
     * User guessed correct word, show victory animation
     */
    function gameWin() {
      var i;
      var ch;
      var unused = false;
      var letters = document.querySelectorAll(gameState.qsAlphabeth + ' > span');
      // Append a div to display "Correct""
      var divCorrect = document.createElement('div');
      divCorrect.innerHTML = _ui.correct;
      divCorrect.classList.add('h5p-hangman-correct');
      document.querySelector(gameState.qsAlphabeth).appendChild(divCorrect);
      // The word "Correct" should now animate to visible
      gameState.win++;
      for (i = 0; i < letters.length; i++) {
        ch = letters[i];
        if (ch.innerHTML != '') {
          unused = true;
          ch.classList.add('h5p-hangman-droppy');
        }
      }
      if (unused) {
        ch.addEventListener('animationend', newGame);
      } else {
        newGame();
      }
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
      var letters = document.querySelectorAll(gameState.qsAlphabeth + ' > span');
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
            ch.addEventListener('animationend', nextOne);
          } else {
            ch.addEventListener('animationend', newGame);
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
      showLetters(gameState.word);
    }

    /**
     * Show unused chars
     */
    function showFree() {
      var s = '';
      gameState.free.forEach(function (ch) {
        s += '<span class="h5p-hangman-freechar">' + ch + '</span>';
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
          gameState.failed++;
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
    function showLetters(word) {
      var bs = word.split('');
      gameState.correct = true;
      gameState.divChar.innerHTML = '';
      bs.forEach(function (ch) {
        var divBs = document.createElement('div');
        if (ch === ' ') {
          divBs.classList.add('h5p-hangman-space');
        } else {
          if (gameState.guessed.indexOf(ch) >= 0) {
            divBs.innerHTML = ch;
          } else {
            gameState.correct = false;
          }
          divBs.classList.add('h5p-hangman-letter');
        }
        gameState.divChar.appendChild(divBs)
      });
    }
  }


  /**
   * Attach function called by H5P framework to insert H5P content into
   * page
   *
   * @param {jQuery} $container
   */
  C.prototype.attach = function ($container) {
    // Set class on container to identify it as a hangman game
    // container.  Allows for styling later.
    $container.addClass('h5p-hangman');
    var myId = this.id;   // in case we have more than one instance active
    var game = 
          '<div id="h5p-hangman-' + myId + '">'
        +   '<div class="h5p-hangman-main">'
        +     '<canvas id="h5p-hangman-graf-' + myId + '" class="h5p-hangman-graf"></canvas>'
        +     '<div  id="h5p-hangman-alphabeth-' + myId + '" class="h5p-hangman-alphabeth">' 
                      + this.options.wordlist + '</div>'
        +   '</div>'
        +   '<div class="h5p-hangman-letters" id="h5p-hangman-letters-' + myId + '"></div>'
        + '</div>';
    $container.append('<div class="hangman-text">'
             + this.options.greeting + '</div>' + game);
    console.log(this.options);
    setup(this.options, myId);
  };

  return C;
})(H5P.jQuery);
