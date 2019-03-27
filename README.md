
! Introduction

This is a sample electron application that downloads images from websites. The code is
for education, demo and personal use only. Don't expect any further support/development
here.

! Building

Execute the following command to build the project:

	npm run build

The project also uses native node modules and they have to compile against the electron
binary but not the system node runtime. Therefore, whenever any native node module is
added, updated or removed, the following command should be executed:

	npm run build:module


