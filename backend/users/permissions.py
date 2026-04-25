"""
users/permissions.py

Custom DRF permission classes for RASP role-based access control.
NFR-2: Role enforcement at API endpoints.

Change: IsSimulationParticipant now includes the 'both' role.
"""

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView


class IsAdministrator(BasePermission):
    message = "Administrator access required."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_administrator
        )


class IsHRPersonnel(BasePermission):
    message = "HR Personnel access required."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_hr_personnel  # now True for 'both' role too
        )


class IsJobSeeker(BasePermission):
    message = "Job Seeker access required."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_job_seeker  # now True for 'both' role too
        )


class IsSimulationParticipant(BasePermission):
    """Allows HR Personnel, Job Seekers, and 'both' role users."""

    message = "Simulation participant access required."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_simulation_participant  # covers hr, job_seeker, both
        )