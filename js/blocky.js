"use strict";

(function() {
    var clearHighlight = function( pane, highlightSpan ) {
        var p = highlightSpan.parentNode;

        if ( p !== null ) {
            var children = highlightSpan.childNodes;
            var presize = children.length;
            var count = 0;

            while ( children.length > 0 ) {
                var child = children[0];

                highlightSpan.removeChild( child );
                p.insertBefore( child, highlightSpan );
            }

            p.removeChild( highlightSpan );
        }
    }

    var replaceHighlight = function( pane, highlightSpan, content ) {
        var p = highlightSpan.parentNode;

        if ( p !== null ) {
            highlightSpan.innerHTML = '';

            var textNode = document.createTextNode( content );
            p.insertBefore( textNode );
            p.removeChild( highlightSpan );
        }
    }

    var updateRange = function( pane, ev, start, highlightSpan ) {
        var end = document.elementFromPoint( ev.pageX, ev.pageY );

        if (
                start !== null &&
                end !== null &&
                end !== highlightSpan &&
                start !== pane && 
                end !== pane
        ) {
            clearHighlight( pane, highlightSpan );
            
            if (
                     end.offsetTop < start.offsetTop ||
                    (end.offsetTop === start.offsetTop && end.offsetLeft < start.offsetLeft)
            ) {
                var temp = start;
                start = end;
                end = temp;
            }

            start.parentNode.insertBefore( highlightSpan, start );

            var node;
            var next = start;
            do {
                node = next;
                if ( node.parentNode !== pane ) {
                    console.log( node );
                    console.log( pane );
                }
                next = node.nextSibling;

                node.parentNode.removeChild( node );
                highlightSpan.appendChild( node );
            } while ( node !== end );
        }
    };

    var isParent = function( root, child ) {
        child = child.parentNode;

        while ( child !== null ) {
            if ( child === root ) {
                return true;
            }

            child = child.parentNode;
        }

        return false;
    }

    var newButton = function( clickFun ) {
        var numKlasses = arguments.length - 1 ;
        var klasses = new Array( numKlasses );
        for ( var i = 0; i < numKlasses; i++ ) {
            klasses[i] = arguments[i+1];
        }

        return bb( klasses, {
            click: function(ev) {
                ev.preventDefault();
                ev.stopPropagation();

                clickFun.call( this, ev );
            }
        } );
    }

    var Blocky = function( el ) {
        var dom = bb.get( el );

        if ( ! (dom instanceof HTMLElement) ) {
            throw new Error("dom element given, not found, or is not an element, " + el);
        }

        var blockyDom = bb(
                '.blocky-scroll-wrap', {
                    addTo: dom,

                    '.blocky-text': {
                        '.blocky-text-gutter': { },

                        '.blocky-text-content': {
                            contenteditable : true,
                            spellcheck      : false
                        }
                    }
                }
        );

        this.textPane   = blockyDom.querySelector( '.blocky-text-content' );
        this.gutterPane = blockyDom.querySelector( '.blocky-text-gutter'  );

        this.numberLines = 0;
        this.ensureLines( 10 );

        this.highlighter = qubyHighlight;
        this.highlighter = textHighlighter;

        var self = this;
        var keyboard = new Clavier({
                onInput: function(c) {
                    // if highlight is in use
                    if ( highlightSpan.parentNode !== null ) {
                        replaceHighlight( self, highlightSpan, c );
                    }
                },

                onBackspace: function() {
                    // if highlight is in use
                    if ( highlightSpan.parentNode !== null ) {
                        replaceHighlight( self, highlightSpan, '' );
                    }
                }
        });
        keyboard.attach();

        var start = null;
        var highlightSpan = bb.span( 'blocky-highlight' );

        touchy.press( this.textPane,
                    function(ev, touchEv) {
                        ev.preventDefault();

                        clearHighlight( this, highlightSpan );

                        var target = ev.target;

                        if ( target === this ) {
                            target = document.elementFromPoint( touchEv.pageX, touchEv.pageY );
                        }

                        if (
                                target !== null &&
                                target !== this &&
                                isParent( this, target )
                        ) {
                            start = target;
                        }

                        updateRange( this, touchEv, start, highlightSpan );
                    },

                    function(ev, touchEv) {
                        ev.preventDefault();

                        updateRange( this, touchEv, start, highlightSpan );
                    },

                    function(ev, touchEv) {
                        ev.preventDefault();

                        updateRange( this, touchEv, start, highlightSpan );
                        start = null;
                    }
        );

        // finally, attack to the screen!
        dom.appendChild( 
                bb( 'blocky-controls',
                        ({  
                                'blocky-open-keyboard': function() {
                                    keyboard.toggle();
                                },
                                'blocky-undo disabled': function() {
                                    // todo
                                },
                                'blocky-redo disabled': function() {
                                    // todo
                                },
                                'blocky-paste': function() {
                                    // todo
                                }
                        }).map( newButton.curry(_, 'blocky-controls-button') )
                )
        );
    }

    var textHighlighter = function(text, onDone) {
        var html = text.replace( /\w+|[^A-Za-z0-9_ ]+/g, function(match) {
            return "<span>" + htmlSafe(match) + "</span>";
        });

        onDone( html );
    }

    var getNumLines = function( text ) {
        var numLines = text.split(/\n\r|\r\n|\n|\r/).length;

        var last = text.charAt(text.length-1);
        if ( last === "\n" || last === "\r" ) {
            numLines--;
        }

        return numLines;
    }

    Blocky.prototype = {
            ensureLines: function( num ) {
                if ( this.numberLines < num ) {
                    var diff = num - this.numberLines;
                    var newLines = new Array( diff );

                    for ( var i = 0; i < diff; i++ ) {
                        // +1, because line numbers start at 1, not 0
                        newLines[i] = i + this.numberLines + 1;
                    }

                    var newLineNums = newLines.join("\n");
                    if ( this.numberLines > 0 ) {
                        newLineNums = "\n" + newLineNums;
                    }

                    this.gutterPane.insertAdjacentHTML( 'beforeend', newLineNums );
                    this.numberLines = num;

                    this.textPane.style.paddingLeft = (this.gutterPane.offsetWidth + 6) + 'px';
                }
            },

            setHighlighter: function( highlighter ) {
                this.highlighter = highlighter;

                return this;
            },

            setText: function( text ) {
                var self = this;

                this.highlighter( text, function(html, numLines) {
                    if ( arguments.length < 2 ) {
                        numLines = getNumLines( text );
                    }

                    self.textPane.innerHTML = html;
                    self.ensureLines( numLines );
                } );

                return this;
            },

            getText: function() {
                return this.textPane.textContent;
            }
    }

    var htmlSafe = (function() {
        var div = document.createElement( 'div' );

        return function( text ) {
            div.textContent = text;
            return div.innerHTML;
        }
    })();

    var qubyHighlight = function( src, onDone ) {
        var parts = src.split( " " );

        var keywords = [
                        'new',
                        'if', 'def', 'class', 'do', 'while', 'else', 'elseif',
                        'end'
                ];

        for ( var i = 0; i < keywords.length; i++ ) {
            keywords[i] = "\\b" + keywords[i] + "\\b";
        }

        var keywords = '(' + keywords.join(')|(') + ')';

        var keysymbols = '(' +
                        [ '>', '<', '!', '=', '==', '!=', '\\+', '\\*', '%', "\\|\\|", '&&', ].join(')|(') +
                ')';

        var regex = '^(' + keywords + ')|(' + keysymbols + ')$';

        var numberRegex = '\\b[0-9]+(\.[0-9])?\\b';
        var identifierRegex = '\\b[a-zA-Z_][a-zA-Z0-9]+\\b';
        var functionCallRegex = identifierRegex + '\\(';

        var splitterRegex = '(' + [ keywords, keysymbols, functionCallRegex, numberRegex, '[\$a-zA-Z0-9_\.]+' ].join(')|(') + ')' ;

        var subRegex = function(match) {
            var index;

            if ( match === '' ) {
                return '';
            } else if ( match.search(/^\[0-9]+(\.[0-9]+)?$/) === 0 ) {
                return '<span class="quby-number">' + htmlSafe(match) + '</span>';
            } else if ( (index = match.indexOf('.')) !== -1 ) {
                return subRegex(match.substring(0, index)) + '.' + subRegex(match.substring(index+1));
            } else if ( match.search(regex) === 0 ) {
                return '<span class="quby-keyword">' + htmlSafe(match) + '</span>';
            } else if ( match.search(/^\$[a-zA-Z_][a-zA-Z_0-9]+$/) === 0 ) {
                return '<span class="quby-global">' + htmlSafe(match) + '</span>';
            } else if ( match.search(new RegExp('^' + functionCallRegex + '$')) === 0 ) {
                return '<span class="quby-function">' + htmlSafe(match.substring(0, match.length-1)) + '</span>' + '(';
            } else if ( match.search(new RegExp('^' + identifierRegex + '$')) === 0 ) {
                return '<span class="quby-variable">' + htmlSafe(match) + '</span>';
            } else if ( match.search(new RegExp('^' + numberRegex + '$')) === 0 ) {
                return '<span class="quby-number">' + htmlSafe(match) + '</span>';
            } else {
                return htmlSafe(match);
            }
        };

        var src = src.replace( new RegExp(splitterRegex, 'g'), subRegex );
        onDone( src );
    }

    window['Blocky'] = Blocky;
})();
