Ozai
====
An easy abstraction of Web Workers allowing for basic threading in the browser.  Use this to prevent
the gui from locking unecessarily when performing large amounts of computation.
   
Creating Ozai
===
To create an Ozai, pass in an object containing all the functions you wish to execute in
a separate thread. If you want the function to execute a callback when it finishes, the
callback should be the final argument in the argument list.

    var ozai = new Ozai({
      superPower: function(a, b, c, callback) {
        callback( Math.pow(a, Math.pow(b, c)) );
      },
      
      reverseString: function(str, callback) {
        var result = str.split('').reverse().join('');
        callback(result, result.length);
      }
    });
    
Using Ozai
===
Each of your functions will be created inside of the new Ozai object.  Call them like so:

    ozai.superPower(2,4,8, function(result) {
      alert("This was calculated in a worker thread: " + result);
    });
    
    ozai.reverseString("abcdefghijklmnopqrstuvwzyz", function(result, len) {
      alert(result + " is " + len + " characters long.");
    });
