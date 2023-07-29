export function welcomeMail(email, password){
    return `
        ${welcomeMailHead()}
        ${welcomeMailBody(email, password)}
    `
}

function welcomeMailHead(){
    return `
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome</title>
            <link href="https://fonts.cdnfonts.com/css/satoshi" rel="stylesheet">
            </link>
            <style>
                body {
                    margin: 0;
                    font-family: 'Satoshi', sans-serif;
                    background: #222B44;
                    display: flex;
                    gap: 24px;
                    font-size: 16px;
                    flex-direction: column;
                    align-items: center;
                    padding: 48px 16px;
                    color: #0A0D14;
                }

                main {
                    border-radius: 10px;
                    background: #FFF;
                    padding: 48px 20px;
                    max-width: 480px;
                }

                .icon {
                    display: flex;
                    justify-content: center;
                }

                h3 {
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 26px;
                    font-weight: 700;
                }

                .details {
                    line-height: 28px;
                    margin-bottom: 16px;
                }

                button {
                    border: 0;
                    display: flex;
                    width: 100%;
                    background: none;
                    justify-content: center;
                    margin-top: 50px;
                }

                button a {
                    display: flex;
                    width: 260px;
                    height: 62px;
                    justify-content: center;
                    align-items: center;
                    border-radius: 5px;
                    background: #0A0D14;
                    text-decoration: none;
                    font-family: 'Satoshi', sans-serif;
                    color: #F4F4F4;
                    font-size: 16px;
                    font-weight: 700;
                }
            </style>
        </head>
    `
}

function welcomeMailBody(email, password){
    return`
        <body>
            <header>
                <img src="/logo.png" alt="">
            </header>
            <main>
                <div class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none">
                        <circle cx="30" cy="30" r="30" fill="#37C696" />
                        <path
                            d="M26.2788 38.5436L18.3569 31.189C17.881 30.7472 17.881 30.0308 18.3569 29.5889L20.0805 27.9887C20.5564 27.5468 21.3281 27.5468 21.8041 27.9887L27.1406 32.9431L38.5709 22.3314C39.0469 21.8895 39.8186 21.8895 40.2945 22.3314L42.0181 23.9315C42.494 24.3734 42.494 25.0898 42.0181 25.5317L28.0024 38.5436C27.5264 38.9855 26.7548 38.9855 26.2788 38.5436Z"
                            fill="white" />
                    </svg>
                </div>
                <h3>Welcome to Wusuaa </h3>

                <p class="details">
                    We are excited to have you here. Your account has been created. Please see below your login credentials to
                    gain access to the platform
                </p>

                <p>
                    <span>Username:</span>
                    <span><b>${email}</b></span>
                </p>

                <p>
                    <span>Password:</span>
                    <span><b>${password}</b></span>
                </p>

                <button>
                    <a href="#">Download App</a>
                </button>
            </main>
        </body>
    `
}