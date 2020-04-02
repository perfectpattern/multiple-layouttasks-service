# MultipleLayouttasksService
A service that receives a pool of bindery signatures and posts them into multiple sPrint One workspaces to create LayoutTasks.

# Configurations
To run properly, this service needs the following environment variables:
| ENV | Description |
| --- | --- |
| FLOW_LOCATION | location of PIB Flow |
| SPO_URL | sPrint One webservice location |
| SPO_TENANT | sPrint One credentials: Tenant |
| SPO_USER | sPrint One credentials: User |
| SPO_PASSWORD | sPrint One credentials: Password |
