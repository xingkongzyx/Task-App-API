Task Manager API
====  


The real demo is on Heroku: https://yz-task-manager.herokuapp.com/
-----

### If you want to test the application, please use Postman because this application is only for backend with NodeJS and MongoDB Database. 

There are mainly two properties which are Users and Tasks. Users can sign in using their "name, age, email, password" and the server will generate a  token for the user. 

<br> If the user wants to update the profile, They need to be authenticated with their token. After that, the user can read the profile, update the profile and delete it(CRUD operations).

<br>  Each user can create their own tasks, the task contains "description, completed" properties. User can log in and then read/update/delete the corresponding tasks. 

