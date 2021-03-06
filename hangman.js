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
    // The qs prefix stands for querySelector

    var gameState = {};        // Keep track of score,words seen etc
    var _ui = options.UI;              // Grab hold of UI for text
    var STARTING = 'STARTING';
    var FAILED = 'FAILED';
    gameState.hints = [];
    var res = [ [] ];

    // GameState.words = options.wordlist.split(',');
    // Wordlist is now an array of words + optional hint
    if (options.useHints) {
      // Words with no hinst stored at idx 0
      options.wordlist.forEach(function(el, idx) {
        var ws = el.words.split(',');
        if (el.hint) {  // A hint is defined for this group
          res[idx + 1] = ws;
          gameState.hints[idx + 1] = el.hint.split(',');
        } else {
          res[0] = res[0].concat(ws);
        }
      });
      gameState.words = res;
    } else {
      gameState.words = [ options.wordlist.reduce(function(tot, ar) {
        var ws = ar.words.split(',');
        return tot.concat(ws);
      } ,[]) ];
    }
    if (gameState.words[0].length === 0) {
      gameState.words.shift();
      gameState.hints.shift();
      // Drop list used for words without hints if empty
      // In the H5P-UI any words without hints are gathered together
      //  and concated in gameState.words[0]
    }
    // gameState.words is now array of array of words
    // gameState.hints is array of array of hints
    // A group of words may have multiple hints
    // DEBUG console.log(gameState);
    
    // As part of setup we create refs to all divs that are altered.
    // We also set up default/starting values
    gameState.attempts = options.attempts || 6;
    gameState.alphabeth = options.alphabeth
                          || 'abcdefghijklmnopqrstuvwxyz';
    gameState.draw = prepDraw();           // Initialize drawing functions
    gameState.qsAlphabeth = '#h5p-hangman-alphabeth-' + myId;
    gameState.divAlphabeth = document.querySelector(gameState.qsAlphabeth);
    gameState.btnHints = document.querySelector('#h5p-hangman-' 
                            + myId + ' .h5p-hangman-hints');
    gameState.divHintText = document.querySelector('#h5p-hangman-' 
                            + myId + ' .h5p-hangman-htext');
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
     * @returns {func} function closure for drawing hangman
     */
    function prepDraw() {
      var hang = [];
      hang.push(function() { $('.draw1').addClass("doshow"); });
      hang.push(function() { $('.draw2').addClass("doshow"); });
      hang.push(function() { $('.draw3').addClass("doshow"); });
      hang.push(function() { $('.draw4').addClass("doshow"); });
      hang.push(function() { $('.draw5').addClass("doshow"); });
      hang.push(function() { $('.draw6').addClass("doshow"); });
      hang.push(function() { $('.draw7').addClass("doshow"); });
      hang.push(function() { $('.draw8').addClass("doshow"); });
      hang.push(function() { $('.draw9').addClass("doshow"); $('.drawA').addClass("doshow"); });
      hang.push(function() { $('.drawB').addClass("doshow"); $('.drawC').addClass("doshow"); });
      hang.push(function() { $('.drawD').addClass("doshow"); $('.drawE').addClass("doshow"); });
      
      /**
       * Drawing function with hang as closure
       *
       * @param {number} n  int count of failed chars
       * @param {number} m  int maximum allowed failures
       */
      return function(n, m) {
        var i;
        $('.noshow').removeClass('doshow');
        n = Math.min(hang.length, Math.round(n * hang.length / m));
        for (i = 0; i < n; i++) {
          hang[i]();  // Draw as many segments as specified by n
        }
      }
    }

    /**
     * Pick a random new word from list, preferably unseen
     * Starts the game with new word
     */
    function newWord() {
      var i = 0;
      var group;
      var word;
      var wordlist;
      var search = true;
      var words = gameState.words;
      // Array of array of words
      while (i < 20 && search) {
        group = Math.floor(Math.random() * words.length);
        wordlist = words[group];
        word = wordlist[Math.floor(Math.random() * wordlist.length)];       
        word = word.replace(/ +/g, ' ');  // Trim duplix space
        search = gameState.seenWords.indexOf(word) >= 0;
        i++;
      }
      if (i < 20) {
        // This is a new word, remember it
        gameState.seenWords.push(word);
      }
      initGame(word.toLowerCase(), group);
      playGame();
    }

    /**
     * Set up start-state for game
     *
     * @param {string} word - word to guess
     * @param {int} group - word group index, any hints refd by this idx
     */
    function initGame(word, group) {
      gameState.failed = 0;   // Number of failed chars
      gameState.free = gameState.alphabeth.split('');
      // Unused chars
      gameState.word = word;
      gameState.uniq = word.split('').sort()
        .filter(function(e, i, ch) { return (i == 0 || e != ch[i - 1]); });
      // Uniq is a list of uniq chars in word
      gameState.guessed = [];   // Array of correct guesses
      gameState.state = STARTING;
      gameState.myHints = gameState.hints.length 
           ?   gameState.hints[group]
           :   [ ];
      gameState.hintsUsed = 0;
      if (gameState.myHints.length) {
        // We have some hints to show
        gameState.btnHints.classList.remove('h5p-hangman-droppy');
        gameState.btnHints.innerHTML = _ui.hints + ':' + gameState.myHints.length;
        gameState.btnHints.onclick = function(e) {
          if (gameState.hintsUsed >= gameState.myHints.length) {
            return;
          }
          gameState.divHintText.innerHTML = gameState.myHints[gameState.hintsUsed];
          gameState.divHintText.classList.add('fadeio');
          gameState.divHintText.addEventListener('animationend', hideHint);
          gameState.hintsUsed ++;
          gameState.btnHints.innerHTML =  _ui.hints + ':' + (gameState.myHints.length - gameState.hintsUsed);
           if (gameState.hintsUsed >= gameState.myHints.length) {
            gameState.btnHints.classList.add('h5p-hangman-droppy');
            // This hides the hint button
          }
        }
      } 
      
      showFree();

      function hideHint(e) {
        gameState.divHintText.classList.remove('fadeio');
      }
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
     * Show remaining hints - if any
     */
    function showFree() {
      var s = '';
      gameState.free.forEach(function(ch) {
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
  C.prototype.attach = function($container) {
    // Set class on container to identify it as a hangman game
    // container.  Allows for styling later.
    $container.addClass('h5p-hangman');
    var myId = this.id;   // In case we have more than one instance active
    var game =
          '<div id="h5p-hangman-' + myId + '">'
        +   '<div class="h5p-hangman-letters" id="h5p-hangman-letters-' + myId + '"></div>'
        +   '<div class="h5p-hangman-main">'
        +     '<div class="h5p-hangman-graf">'
        +      '<div class="h5p-hangman-draw">'
        +        '<div class="h5p-hangman-draw draw0"></div>'
        +        '<div class="h5p-hangman-draw draw1 noshow"></div>'
        +        '<div class="h5p-hangman-draw draw2 noshow"></div>'
        +        '<div class="h5p-hangman-draw draw3 noshow"></div>'
        +        '<div class="h5p-hangman-draw draw4 noshow"></div>'
        +        '<div class="h5p-hangman-draw draw5 noshow"></div>'
        +        '<div class="h5p-hangman-draw draw6 noshow"></div>'
        +        '<div class="h5p-hangman-draw draw7 noshow"></div>'
        +        '<div class="h5p-hangman-draw draw8 noshow"></div>'
        +        '<div class="h5p-hangman-draw draw9 noshow"></div>'
        +        '<div class="h5p-hangman-draw drawA noshow"></div>'
        +        '<div class="h5p-hangman-draw drawB noshow"></div>'
        +        '<div class="h5p-hangman-draw drawC noshow"></div>'
        +        '<div class="h5p-hangman-draw drawD noshow"></div>'
        +        '<div class="h5p-hangman-draw drawE noshow"></div>'
        +      '</div>'
        +     '</div>'
        +     '<div  id="h5p-hangman-alphabeth-' + myId + '" class="h5p-hangman-alphabeth">' 
                      + this.options.wordlist + '</div>'
        // If useHints is checked add button for hints
        + ((this.options.useHints) ? '<button type="button" class="h5p-hangman-hints"></button>' : '' )
        +     '<div class="h5p-hangman-htext"></div>'                  
        +   '</div>'
        + '</div>';
    $container.append('<div class="hangman-text">'
             + this.options.greeting + '</div>' + game);
    console.log(this.options);
    setup(this.options, myId);
  };

  return C;
})(H5P.jQuery);
