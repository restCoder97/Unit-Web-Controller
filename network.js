var ip_input = document.getElementById('ip-address');
var port_input = document.getElementById('port');
var connect_button = document.querySelector('.connect-form button');
var socket = null

document.addEventListener('DOMContentLoaded', function() {
    ip_input = document.getElementById('ip-address');
    port_input = document.getElementById('port');
    connect_button = document.querySelector('.connect-form button');
    connect_button.addEventListener('click',()=>{
        console.log('Trying Connect To Test Macbook.');
        const str_ip = ip_input.valuel;
        const str_port = port_input.value;
        socket = new WebSocket(`ws://${str_ip}:${str_port}`);
        socket.addEventListener('open', event => {
          console.log('WebSocket connection established.');
        });
      })
});
  

